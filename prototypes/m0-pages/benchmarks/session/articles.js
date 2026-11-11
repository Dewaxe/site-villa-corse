import { queuePublication, validatedImageKey } from "./publication-jobs.js";
import { isDemoWebP, readDraftForm } from "./webp.js";
import { readJson, requestErrorStatus } from "./request-limits.js";

const articlePath = "/articles/article-test";
const mediaPrefix = "/media/article/";
const mediaRoute = /^\/media\/article\/([0-9a-f-]{36})\.webp$/;
const placeholder = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#ddd"/></svg>';
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" };
const mediaKey = (revision) => "article/" + revision + ".webp";

function json(body, status = 200) {
  return Response.json(body, { status, headers });
}

function escape(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

async function articlePage(db, origin) {
  const revision = await db.prepare(`
    SELECT r.* FROM article_state s JOIN article_revisions r ON r.id = s.revision_id WHERE s.id = 1
  `).first();
  if (!revision) return json({ error: "Article introuvable." }, 404);

  const title = escape(revision.title);
  return new Response(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
<meta name="description" content="${escape(revision.description)}">
<link rel="canonical" href="${origin}${articlePath}"></head>
<body><main><article><h1>${title}</h1><p>${escape(revision.body)}</p>
<img src="${mediaPrefix}${revision.id}.webp" alt="Illustration de démonstration">
</article></main></body></html>`, {
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

async function articleImage(db, images, revision) {
  const published = await db.prepare("SELECT 1 FROM article_revisions WHERE id = ? AND published = 1")
    .bind(revision).first();
  if (!published) return json({ error: "Image introuvable." }, 404);

  let image;
  try {
    image = await images.get(await validatedImageKey(db, revision), "arrayBuffer");
  } catch {
    image = null;
  }
  return new Response(image ?? placeholder, {
    headers: { ...headers, "Content-Type": image ? "image/webp" : "image/svg+xml" },
  });
}

export function publicArticle(request, db, images, url) {
  if (request.method !== "GET") return;
  if (url.pathname === articlePath) return articlePage(db, url.origin);
  const match = mediaRoute.exec(url.pathname);
  if (match) return articleImage(db, images, match[1]);
}

async function createDraft(request, db, images) {
  let form;
  try {
    form = await readDraftForm(request);
  } catch (error) {
    return json({ error: "Upload invalide ou trop volumineux." }, requestErrorStatus(error));
  }
  const fields = ["title", "description", "body"].map((name) => form?.get(name));
  if (fields.some((value, index) => typeof value !== "string" || !value.trim() ||
      value.length > [120, 240, 4_000][index])) return json({ error: "Champs invalides." }, 400);

  const image = form.get("image");
  if (!(await isDemoWebP(image))) return json({ error: "WebP de démonstration invalide." }, 400);

  const id = crypto.randomUUID();
  try {
    await images.put(mediaKey(id), image.stream());
  } catch {
    return json({ error: "Stockage de l’image indisponible." }, 503);
  }
  await db.prepare("INSERT INTO article_revisions (id, title, description, body) VALUES (?, ?, ?, ?)")
    .bind(id, ...fields.map((value) => value.trim())).run();
  return json({ id }, 201);
}

async function publish(request, db, images, dispatch) {
  let data;
  try {
    data = await readJson(request, 1_024);
  } catch (error) {
    return json({ error: "Requête invalide." }, requestErrorStatus(error));
  }
  if (typeof data?.id !== "string" || !Number.isSafeInteger(data?.version) || data.version < 0) {
    return json({ error: "Révision ou version invalide." }, 400);
  }
  const revision = await db.prepare("SELECT id FROM article_revisions WHERE id = ?").bind(data.id).first();
  if (!revision) return json({ error: "Révision introuvable." }, 404);

  try {
    if (!(await images.get(mediaKey(revision.id), "arrayBuffer"))) {
      return json({ error: "Image indisponible, publication différée." }, 503);
    }
  } catch {
    return json({ error: "Image indisponible, publication différée." }, 503);
  }

  if (dispatch) {
    const queued = await queuePublication(db, images, revision.id, data.version);
    if (!queued.job) return json({ error: "Version périmée." }, queued.status);
    if (queued.job.failed) return json({ error: "Image refusée. Enregistre un brouillon avec une nouvelle image." }, 422);
    try {
      await dispatch(queued.job.id);
    } catch (error) {
      const message = ["Déclencheur non configuré", "Connexion GitHub impossible (en-tête).", "Connexion GitHub impossible (réseau).", "Format du jeton GitHub invalide."].includes(error?.message) || /^Déclenchement GitHub refusé \(\d{3}\)\.$/.test(error?.message ?? "")
        ? error.message : "Traitement indisponible. La demande est conservée.";
      return json({ error: message }, 503);
    }
    return json({ pending: true, id: queued.job.id, remainingMs: Math.max(0, queued.job.expires_at - Date.now()) }, 202);
  }

  const result = await db.prepare(`
    UPDATE article_state SET revision_id = ?, version = version + 1
    WHERE id = 1 AND version = ? RETURNING version
  `).bind(revision.id, data.version).first();
  return result ? json(result) : json({ error: "Publication concurrente, recharge l’état." }, 409);
}

export async function adminArticle(request, db, images, path, dispatch) {
  const jobPath = /^\/api\/articles\/jobs\/([0-9a-f-]{36})$/.exec(path);
  if (request.method === "GET" && jobPath) {
    const job = await db.prepare(`
      SELECT CASE
        WHEN failed = 1 THEN 'failed'
        WHEN status = 'pending' AND expires_at <= ? THEN 'expired'
        ELSE status
      END AS status FROM publication_jobs WHERE id = ?
    `).bind(Date.now(), jobPath[1]).first();
    return job ? json(job) : json({ error: "Demande introuvable." }, 404);
  }
  if (request.method === "GET" && path === "/api/articles") {
    const [state, revisions] = await db.batch([
      db.prepare("SELECT version, revision_id FROM article_state WHERE id = 1"),
      db.prepare("SELECT id, title, published FROM article_revisions ORDER BY rowid DESC"),
    ]);
    return json({ ...state.results[0], revisions: revisions.results });
  }

  if (request.method === "POST" && path === "/api/articles/draft") return createDraft(request, db, images);
  if (request.method === "POST" && path === "/api/articles/publish") return publish(request, db, images, dispatch);
  return json({ error: "Route inconnue." }, 404);
}
