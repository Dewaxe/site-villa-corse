import { isDemoWebP } from "./webp.js";

const key = (id) => "article/" + id + ".webp";
const hash = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function queuePublication(db, images, revision, version) {
  const source = await images.get(key(revision), "arrayBuffer");
  if (!source) return { status: 503 };
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 8 * 60_000;
  const inserted = await db.prepare(`
    INSERT INTO publication_jobs (id, source_revision, expected_version, source_sha256, expires_at)
    SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM article_state WHERE id = 1 AND version = ?)
    ON CONFLICT (source_revision, expected_version) DO UPDATE SET
      id = excluded.id, source_sha256 = excluded.source_sha256, expires_at = excluded.expires_at
    WHERE status = 'pending' AND failed = 0 AND expires_at <= ?
    RETURNING *
  `).bind(id, revision, version, await hash(source), expiresAt, version, now).first();
  const job = inserted ?? await db.prepare(
    "SELECT * FROM publication_jobs WHERE source_revision = ? AND expected_version = ?"
  ).bind(revision, version).first();
  return job ? { status: 202, job } : { status: 409 };
}

export async function publicationInput(db, images, id) {
  const job = await db.prepare("SELECT * FROM publication_jobs WHERE id = ?").bind(id).first();
  if (!job || job.status !== "pending" || job.failed || job.expires_at <= Date.now()) return null;
  const bytes = await images.get(key(job.source_revision), "arrayBuffer");
  if (!bytes || await hash(bytes) !== job.source_sha256) return null;
  return { job, bytes };
}

export async function finishPublication(db, images, id, sourceHash, bytes) {
  const job = await db.prepare("SELECT * FROM publication_jobs WHERE id = ?").bind(id).first();
  if (!job) return "unknown";
  const digest = await hash(bytes);
  if (job.source_sha256 !== sourceHash) return "mismatch";
  if (job.failed) return "failed";
  if (job.status !== "pending") {
    return job.result_sha256 === digest ? job.status : "mismatch";
  }
  if (job.expires_at <= Date.now()) return "expired";
  if (!(await isDemoWebP(new File([bytes], id, { type: "image/webp" })))) return "invalid";
  // An immutable key shared by retries must contain the exact same bytes.
  const outputKey = "validated/" + id + "/" + digest + ".webp";
  await images.put(outputKey, bytes);
  const now = Date.now();
  await db.batch([
    db.prepare(`
      INSERT INTO article_revisions (id, title, description, body)
      SELECT ?, title, description, body FROM article_revisions WHERE id = ?
      AND EXISTS (SELECT 1 FROM article_state WHERE id = 1 AND version = ?)
      AND EXISTS (SELECT 1 FROM publication_jobs WHERE id = ? AND status = 'pending' AND failed = 0 AND expires_at > ?)
      ON CONFLICT (id) DO NOTHING
    `).bind(id, job.source_revision, job.expected_version, id, now),
    db.prepare(`
      UPDATE article_state SET revision_id = ?, version = version + 1
      WHERE id = 1 AND version = ? AND EXISTS (
        SELECT 1 FROM publication_jobs WHERE id = ? AND status = 'pending' AND failed = 0 AND expires_at > ?
      ) RETURNING version
    `).bind(id, job.expected_version, id, now),
    db.prepare(`
      UPDATE publication_jobs
      SET status = CASE WHEN changes() = 1 THEN 'published' ELSE 'stale' END,
          result_sha256 = ?
      WHERE id = ? AND status = 'pending' AND failed = 0 AND expires_at > ?
    `).bind(digest, id, now),
  ]);
  const result = await db.prepare("SELECT status, failed, expires_at FROM publication_jobs WHERE id = ?").bind(id).first();
  if (!result) return "expired";
  if (result.failed) return "failed";
  if (result.status === "pending" && result.expires_at <= now) return "expired";
  return result.status;
}

export async function failPublication(db, id, sourceHash) {
  const job = await db.prepare(`
    UPDATE publication_jobs SET failed = 1
    WHERE id = ? AND source_sha256 = ? AND status = 'pending' AND expires_at > ?
    RETURNING id
  `).bind(id, sourceHash, Date.now()).first();
  return Boolean(job);
}

export async function validatedImageKey(db, revision) {
  const job = await db.prepare(
    "SELECT result_sha256 FROM publication_jobs WHERE id = ? AND status = 'published'"
  ).bind(revision).first();
  return job ? "validated/" + revision + "/" + job.result_sha256 + ".webp" : key(revision);
}
