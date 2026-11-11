import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { publicationInput, finishPublication, failPublication, stagePublication, commitStagedPublication } from "./publication-jobs.js";
import { readBoundedBytes } from "./request-limits.js";

const jobPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
const digestPattern = /^[0-9a-f]{64}$/;
const receiptMessage = (id, source, digest) => new TextEncoder().encode(`m0-publication-v1:${id}:${source}:${digest}`);

export async function dispatchPublication(id, env) {
  if (!jobPattern.test(id) || !env.GITHUB_DISPATCH_TOKEN) throw new Error("Déclencheur non configuré");
  const token = env.GITHUB_DISPATCH_TOKEN.trim();
  if (!/^github_pat_[A-Za-z0-9_]+$/.test(token)) throw new Error("Format du jeton GitHub invalide.");
  const response = await fetch(
    "https://api.github.com/repos/Dewaxe/site-villa-corse/actions/workflows/413876229/dispatches", {
      method: "POST", redirect: "manual",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json", "User-Agent": "Villa-Corse-M0",
      },
      body: JSON.stringify({ ref: "m0/routage-pages", inputs: { job: id } }),
    }).catch((error) => {
      const cause = /header|byte|character/i.test(error?.message ?? "") ? "en-tête" : "réseau";
      throw new Error("Connexion GitHub impossible (" + cause + ").");
    });
  if (![200, 204].includes(response.status)) throw new Error("Déclenchement GitHub refusé (" + response.status + ").");
}

export async function validationCallback(request, env) {
  const path = new URL(request.url).pathname;
  const match = /^\/internal\/publication\/([^/]+)\/(input|manifest|result|failure|stage|commit|static-deployed)$/.exec(path);
  const denied = () => new Response(null, { status: 404, headers });
  if (!match || !jobPattern.test(match[1])) return denied();
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(env.VALIDATION_TOKEN ?? "") ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(env.VALIDATION_TOKEN))) return denied();
  const [, id, action] = match;
  if (action === "static-deployed" && request.method === "POST" && env.PUBLICATION_STATIC_PROBE === "1") {
    const source = request.headers.get("X-Source-SHA256");
    if (!digestPattern.test(source ?? "")) return new Response(null, { status: 400, headers });
    const job = await env.DB.prepare(`
      UPDATE publication_jobs SET status = 'published'
      WHERE id = ? AND source_sha256 = ? AND failed = 0 AND result_sha256 IS NULL
        AND (status = 'published' OR (status = 'pending' AND expires_at > ?))
      RETURNING id
    `).bind(id, source, Date.now()).first();
    return new Response(null, { status: job ? 204 : 409, headers });
  }
  if (action === "manifest" && request.method === "GET" && env.PUBLICATION_STATIC_PROBE === "1") {
    const revision = await env.DB.prepare(`
      SELECT revision.id, revision.title, revision.description, revision.body, job.source_sha256
      FROM publication_jobs AS job JOIN article_revisions AS revision ON revision.id = job.source_revision
      WHERE job.id = ? AND job.status = 'pending' AND job.failed = 0 AND job.expires_at > ?
    `).bind(id, Date.now()).first();
    return revision ? Response.json(revision, { headers }) : denied();
  }
  if ((action === "stage" || action === "commit") && request.method === "POST") {
    const secret = env.PUBLICATION_RECEIPT_KEY;
    if (!/^[A-Za-z0-9_-]{43}$/.test(secret ?? "") || secret === env.VALIDATION_TOKEN) return denied();
    const source = request.headers.get("X-Source-SHA256");
    if (!digestPattern.test(source ?? "")) return new Response(null, { status: 400, headers });
    try {
      const key = await crypto.subtle.importKey("raw", Buffer.from(secret, "base64url"),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
      if (action === "stage") {
        if (request.headers.get("Content-Type") !== "image/webp") return new Response(null, { status: 400, headers });
        const digest = await stagePublication(env.IMAGES, id, await readBoundedBytes(request, 250_000));
        if (!digest) return new Response(null, { status: 400, headers });
        const signature = await crypto.subtle.sign("HMAC", key, receiptMessage(id, source, digest));
        return Response.json({ digest, receipt: Buffer.from(signature).toString("hex") }, { headers });
      }
      const digest = request.headers.get("X-Result-SHA256");
      const receipt = request.headers.get("X-Publication-Receipt");
      if (!digestPattern.test(digest ?? "") || !digestPattern.test(receipt ?? "") ||
          !await crypto.subtle.verify("HMAC", key, Buffer.from(receipt, "hex"), receiptMessage(id, source, digest))) {
        return new Response(null, { status: 409, headers });
      }
      const status = await commitStagedPublication(env.DB, id, source, digest);
      return Response.json({ status }, { status: ["published", "stale"].includes(status) ? 200 : 409, headers });
    } catch {
      return new Response(null, { status: 503, headers });
    }
  }
  if (action === "input" && request.method === "GET") {
    const input = await publicationInput(env.DB, env.IMAGES, id);
    return input ? new Response(input.bytes, { headers: {
      ...headers, "Content-Type": "image/webp", "X-Source-SHA256": input.job.source_sha256,
    } }) : denied();
  }
  if (action === "failure" && request.method === "POST") {
    const failed = await failPublication(env.DB, id, request.headers.get("X-Source-SHA256"));
    return new Response(null, { status: failed ? 204 : 409, headers });
  }
  if (action === "result" && request.method === "POST") {
    if (request.headers.get("Content-Type") !== "image/webp") return new Response(null, { status: 400, headers });
    try {
      const timings = [];
      let previous = Date.now();
      const mark = env.PUBLICATION_TIMINGS === "1" ? (phase) => {
        const now = Date.now();
        timings.push(`${phase};dur=${now - previous}`);
        previous = now;
      } : undefined;
      const bytes = await readBoundedBytes(request, 250_000);
      mark?.("body");
      const status = await finishPublication(env.DB, env.IMAGES, id,
        request.headers.get("X-Source-SHA256"), bytes, mark);
      const response = Response.json({ status }, { status: ["published", "stale"].includes(status) ? 200 : 409, headers });
      if (mark) response.headers.set("Server-Timing", timings.join(", "));
      return response;
    } catch {
      return new Response(null, { status: 503, headers });
    }
  }
  return denied();
}
