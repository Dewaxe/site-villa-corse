import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function createPublication() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE published (version INTEGER NOT NULL, revision TEXT NOT NULL);
    INSERT INTO published VALUES (1, 'initial');
    CREATE TABLE pending (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      bytes BLOB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);

  const current = () => db.prepare("SELECT * FROM published").get();
  const request = (id, bytes) => {
    db.prepare("INSERT INTO pending (id, version, bytes) VALUES (?, ?, ?)")
      .run(id, current().version, bytes);
  };
  const read = (id) => db.prepare("SELECT * FROM pending WHERE id = ?").get(id);
  const complete = ({ id, sha256 }) => {
    const job = read(id);
    if (!job) return "unknown";
    if (digest(job.bytes) !== sha256) return "mismatch";
    if (job.status !== "pending") return job.status;

    db.exec("BEGIN");
    try {
      const update = db.prepare("UPDATE published SET version = version + 1, revision = ? WHERE version = ?")
        .run(id, job.version);
      const status = update.changes === 1 ? "published" : "stale";
      db.prepare("UPDATE pending SET status = ? WHERE id = ?").run(status, id);
      db.exec("COMMIT");
      return status;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const process = async (id, validate) => {
    const job = read(id);
    if (!job) return "unknown";
    if (job.status !== "pending") return job.status;
    const proof = await validate(id, job.bytes);
    return proof?.id === id ? complete(proof) : "invalid";
  };
  return { current, request, read, complete, process, close: () => db.close() };
}
