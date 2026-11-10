import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { adminArticle, publicArticle } from "../session/articles.js";
import { publicationInput, finishPublication } from "../session/publication-jobs.js";
import { processImage } from "./processor.js";

const sqlite = new DatabaseSync(":memory:");
for (const migration of ["0001_auth", "0002_recovery", "0003_article", "0004_hardening", "0005_publication_jobs"]) {
  sqlite.exec(await readFile(new URL("../session/migrations/" + migration + ".sql", import.meta.url), "utf8"));
}
function statement(sql, args = []) {
  return {
    bind: (...values) => statement(sql, values),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    run: async () => ({ meta: sqlite.prepare(sql).run(...args) }),
    execute: () => ({ results: sqlite.prepare(sql).all(...args) }),
  };
}
const db = {
  prepare: (sql) => statement(sql),
  batch: async (statements) => {
    sqlite.exec("BEGIN");
    try {
      const results = statements.map((query) => query.execute());
      sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  },
};
const media = new Map();
const images = {
  get: async (key) => media.get(key) ?? null,
  put: async (key, bytes) => {
    media.set(key, bytes instanceof ReadableStream ? await new Response(bytes).arrayBuffer() : bytes);
  },
};
const origin = "http://localhost:8791";
const source = await readFile(new URL("../../.wrangler/webp-decoder/fixtures/small.bin", import.meta.url));
const draft = crypto.randomUUID();
sqlite.prepare("INSERT INTO article_revisions (id,title,description,body) VALUES (?,?,?,?)")
  .run(draft, "Test", "Description", "Texte");
await images.put("article/" + draft + ".webp", source);
const publish = (version, dispatch) => adminArticle(new Request(origin + "/api/articles/publish", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: draft, version }),
}), db, images, "/api/articles/publish", dispatch);

try {
  const dispatched = [];
  const dispatch = async (id) => dispatched.push(id);
  const failedDispatch = await publish(0, async () => { throw new Error("Déclenchement indisponible"); });
  assert.equal(failedDispatch.status, 503);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM publication_jobs").get().n, 1);
  const response = await publish(0, dispatch);
  assert.equal(response.status, 202);
  const { id } = await response.json();
  assert.deepEqual(dispatched, [id]);
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, null);
  const retry = await publish(0, dispatch);
  assert.equal((await retry.json()).id, id);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM publication_jobs").get().n, 1);
  assert.equal((await publicArticle(new Request(origin + "/media/article/" + draft + ".webp"), db, images,
    new URL(origin + "/media/article/" + draft + ".webp"))).status, 404);
  const input = await publicationInput(db, images, id);
  const proof = await processImage(id, Buffer.from(input.bytes));
  assert.ok(proof);
  assert.equal(await finishPublication(db, images, id, "bad", proof.output), "mismatch");
  const brokenKv = { ...images, put: async () => { throw new Error("KV indisponible"); } };
  await assert.rejects(finishPublication(db, brokenKv, id, proof.sourceSha256, proof.output), /indisponible/);
  assert.equal(sqlite.prepare("SELECT version FROM article_state").get().version, 0);
  assert.equal(await finishPublication(db, images, id, proof.sourceSha256, proof.output), "published");
  assert.equal(await finishPublication(db, images, id, proof.sourceSha256, proof.output), "published");
  assert.equal(sqlite.prepare("SELECT version FROM article_state").get().version, 1);
  const url = new URL(origin + "/media/article/" + id + ".webp");
  const image = await publicArticle(new Request(url), db, images, url);
  assert.equal(image.status, 200);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), proof.output);

  const queued = await publish(1, dispatch);
  const staleId = (await queued.json()).id;
  const laterInput = await publicationInput(db, images, staleId);
  const laterProof = await processImage(staleId, Buffer.from(laterInput.bytes));
  sqlite.exec("UPDATE article_state SET version = version + 1 WHERE id = 1");
  assert.equal(await finishPublication(db, images, staleId, laterProof.sourceSha256, laterProof.output), "stale");
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, id);
  assert.equal(sqlite.prepare("SELECT id FROM article_revisions WHERE id = ?").get(staleId), undefined);
  console.log("Handlers article : demande durable, dérivé privé, publication, panne KV, rejeu et résultat périmé vérifiés.");
} finally {
  sqlite.close();
}
