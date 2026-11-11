import { isDemoWebP } from "./webp.js";

const key = (id) => "article/" + id + ".webp";
const hash = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function queuePublication(db, images, revision, version) {
  const source = await images.get(key(revision), "arrayBuffer");
  if (!source) return { status: 503 };
  const id = crypto.randomUUID();
  const inserted = await db.prepare(`
    INSERT INTO publication_jobs (id, source_revision, expected_version, source_sha256)
    SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM article_state WHERE id = 1 AND version = ?)
    ON CONFLICT (source_revision, expected_version) DO NOTHING
    RETURNING *
  `).bind(id, revision, version, await hash(source), version).first();
  const job = inserted ?? await db.prepare(
    "SELECT * FROM publication_jobs WHERE source_revision = ? AND expected_version = ?"
  ).bind(revision, version).first();
  return job ? { status: 202, job } : { status: 409 };
}

export async function publicationInput(db, images, id) {
  const job = await db.prepare("SELECT * FROM publication_jobs WHERE id = ?").bind(id).first();
  if (!job || job.status !== "pending" || job.failed) return null;
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
  if (!(await isDemoWebP(new File([bytes], id, { type: "image/webp" })))) return "invalid";
  // An immutable key shared by retries must contain the exact same bytes.
  const outputKey = "validated/" + id + "/" + digest + ".webp";
  await images.put(outputKey, bytes);
  await db.batch([
    db.prepare(`
      INSERT INTO article_revisions (id, title, description, body)
      SELECT ?, title, description, body FROM article_revisions WHERE id = ?
      AND EXISTS (SELECT 1 FROM article_state WHERE id = 1 AND version = ?)
      AND EXISTS (SELECT 1 FROM publication_jobs WHERE id = ? AND status = 'pending' AND failed = 0)
      ON CONFLICT (id) DO NOTHING
    `).bind(id, job.source_revision, job.expected_version, id),
    db.prepare(`
      UPDATE article_state SET revision_id = ?, version = version + 1
      WHERE id = 1 AND version = ? AND EXISTS (
        SELECT 1 FROM publication_jobs WHERE id = ? AND status = 'pending' AND failed = 0
      ) RETURNING version
    `).bind(id, job.expected_version, id),
    db.prepare(`
      UPDATE publication_jobs
      SET status = CASE WHEN changes() = 1 THEN 'published' ELSE 'stale' END,
          result_sha256 = ?
      WHERE id = ? AND status = 'pending' AND failed = 0
    `).bind(digest, id),
  ]);
  const result = await db.prepare("SELECT status FROM publication_jobs WHERE id = ?").bind(id).first();
  return result.status;
}

export async function failPublication(db, id, sourceHash) {
  const job = await db.prepare(`
    UPDATE publication_jobs SET failed = 1
    WHERE id = ? AND source_sha256 = ? AND status = 'pending'
    RETURNING id
  `).bind(id, sourceHash).first();
  return Boolean(job);
}

export async function validatedImageKey(db, revision) {
  const job = await db.prepare(
    "SELECT result_sha256 FROM publication_jobs WHERE id = ? AND status = 'published'"
  ).bind(revision).first();
  return job ? "validated/" + revision + "/" + job.result_sha256 + ".webp" : key(revision);
}
