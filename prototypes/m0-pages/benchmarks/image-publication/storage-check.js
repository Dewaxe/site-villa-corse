import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { adminArticle, publicArticle } from "../session/articles.js";
import { publicationInput, finishPublication } from "../session/publication-jobs.js";
import { processImage } from "./processor.js";
import { buildStaticRelease } from "./static-release.js";
import { validationCallback, dispatchPublication } from "../session/github-publication.js";

const sqlite = new DatabaseSync(":memory:");
for (const migration of ["0001_auth", "0002_recovery", "0003_article", "0004_hardening", "0005_publication_jobs", "0006_publication_failure", "0007_publication_deadline"]) {
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
const source = await sharp({ create: { width: 320, height: 240, channels: 3, background: "#437085" } })
  .webp().toBuffer();
const draft = crypto.randomUUID();
sqlite.prepare("INSERT INTO article_revisions (id,title,description,body) VALUES (?,?,?,?)")
  .run(draft, "Test", "Description", "Texte");
await images.put("article/" + draft + ".webp", source);
const publish = (version, dispatch, revision = draft) => adminArticle(new Request(origin + "/api/articles/publish", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: revision, version }),
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
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /actions\/workflows\/413876229\/dispatches$/);
      assert.equal(options.headers.Authorization, "Bearer github_pat_test");
      assert.deepEqual(JSON.parse(options.body), { ref: "m0/routage-pages", inputs: { job: id } });
      return new Response(null, { status: 204 });
    };
    await dispatchPublication(id, { GITHUB_DISPATCH_TOKEN: " github_pat_test " });
    await assert.rejects(dispatchPublication(id, {}), /non configuré/);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, null);
  const retry = await publish(0, dispatch);
  assert.equal((await retry.json()).id, id);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM publication_jobs").get().n, 1);
  assert.equal((await publicArticle(new Request(origin + "/media/article/" + draft + ".webp"), db, images,
    new URL(origin + "/media/article/" + draft + ".webp"))).status, 404);
  const validationEnv = { DB: db, IMAGES: images, VALIDATION_TOKEN: "v".repeat(43) };
  const callbackUrl = origin + "/internal/publication/" + id;
  const staticEnv = { ...validationEnv, PUBLICATION_STATIC_PROBE: "1" };
  const manifestRequest = () => new Request(callbackUrl + "/manifest", {
    headers: { Authorization: "Bearer " + validationEnv.VALIDATION_TOKEN },
  });
  assert.equal((await validationCallback(new Request(callbackUrl + "/manifest"), staticEnv)).status, 404);
  assert.equal((await validationCallback(manifestRequest(), validationEnv)).status, 404);
  const manifestResponse = await validationCallback(manifestRequest(), staticEnv);
  assert.equal(manifestResponse.status, 200);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.id, draft);
  assert.equal((await validationCallback(new Request(callbackUrl + "/input"), validationEnv)).status, 404);
  const privateInput = await validationCallback(new Request(callbackUrl + "/input", {
    headers: { Authorization: "Bearer " + validationEnv.VALIDATION_TOKEN },
  }), validationEnv);
  assert.equal(privateInput.status, 200);
  assert.equal(manifest.source_sha256, privateInput.headers.get("X-Source-SHA256"));
  const staticSource = Buffer.from(await privateInput.arrayBuffer());
  assert.equal(createHash("sha256").update(staticSource).digest("hex"), manifest.source_sha256);
  const staticRoot = await mkdtemp(join(tmpdir(), "villa-m0-handoff-"));
  try {
    const release = await buildStaticRelease(staticRoot, "https://villa.example", manifest, staticSource);
    const html = await readFile(join(release, "articles", "article-test", "index.html"), "utf8");
    assert.ok(html.includes(`/media/article/${draft}.webp`));
  } finally {
    await rm(staticRoot, { recursive: true, force: true });
  }
  const input = await publicationInput(db, images, id);
  const proof = await processImage(id, Buffer.from(input.bytes));
  assert.ok(proof);
  assert.equal(await finishPublication(db, images, id, "bad", proof.output), "mismatch");
  const brokenKv = { ...images, put: async () => { throw new Error("KV indisponible"); } };
  await assert.rejects(finishPublication(db, brokenKv, id, proof.sourceSha256, proof.output), /indisponible/);
  assert.equal(sqlite.prepare("SELECT version FROM article_state").get().version, 0);
  const resultRequest = () => new Request(callbackUrl + "/result", {
    method: "POST", headers: {
      Authorization: "Bearer " + validationEnv.VALIDATION_TOKEN,
      "Content-Type": "image/webp", "X-Source-SHA256": proof.sourceSha256,
    }, body: proof.output,
  });
  const competingOutput = Buffer.from(proof.output);
  competingOutput[30] ^= 1;
  const competingKv = { ...images, put: async (key, bytes) => {
    await images.put(key, bytes);
    const callback = await validationCallback(resultRequest(), { ...validationEnv, PUBLICATION_TIMINGS: "1" });
    assert.equal(callback.status, 200);
    assert.match(callback.headers.get("Server-Timing"), /^body;dur=\d+, lookup;dur=\d+, digest;dur=\d+, webp;dur=\d+, kv;dur=\d+, d1;dur=\d+$/);
    assert.equal((await callback.json()).status, "published");
  } };
  assert.equal(await finishPublication(db, competingKv, id, proof.sourceSha256, competingOutput), "mismatch");
  const replayedCallback = await validationCallback(new Request(callbackUrl + "/result", {
    method: "POST", headers: {
      Authorization: "Bearer " + validationEnv.VALIDATION_TOKEN,
      "Content-Type": "image/webp", "X-Source-SHA256": proof.sourceSha256,
    }, body: proof.output,
  }), validationEnv);
  assert.equal(replayedCallback.status, 200);
  assert.equal((await validationCallback(manifestRequest(), staticEnv)).status, 404);
  assert.equal(replayedCallback.headers.get("Server-Timing"), null);
  assert.equal((await replayedCallback.json()).status, "published");
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
  const failedRequest = await publish(2, dispatch);
  const failedId = (await failedRequest.json()).id;
  const failedInput = await publicationInput(db, images, failedId);
  const invalid = (sourceHash) => validationCallback(new Request(origin + "/internal/publication/" + failedId + "/failure", {
    method: "POST", headers: { Authorization: "Bearer " + validationEnv.VALIDATION_TOKEN, "X-Source-SHA256": sourceHash },
  }), validationEnv);
  assert.equal((await invalid("wrong")).status, 409);
  assert.equal((await invalid(failedInput.job.source_sha256)).status, 204);
  assert.equal((await invalid(failedInput.job.source_sha256)).status, 204);
  assert.equal(await publicationInput(db, images, failedId), null);
  assert.equal(await finishPublication(db, images, failedId, failedInput.job.source_sha256, proof.output), "failed");
  assert.equal((await publish(2, dispatch)).status, 422);
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, id);
  const slowDraft = crypto.randomUUID();
  sqlite.prepare("INSERT INTO article_revisions (id,title,description,body) VALUES (?,?,?,?)")
    .run(slowDraft, "Test lent", "Description", "Texte");
  await images.put("article/" + slowDraft + ".webp", source);
  const slow = await (await publish(2, dispatch, slowDraft)).json();
  const slowInput = await publicationInput(db, images, slow.id);
  assert.ok(slow.remainingMs > 0);
  const expiresDuringWrite = { ...images, put: async (key, bytes) => {
    await images.put(key, bytes);
    sqlite.prepare("UPDATE publication_jobs SET expires_at = 0 WHERE id = ?").run(slow.id);
  } };
  assert.equal(await finishPublication(db, expiresDuringWrite, slow.id, slowInput.job.source_sha256, proof.output), "expired");
  assert.equal(await publicationInput(db, images, slow.id), null);
  const statusUrl = origin + "/api/articles/jobs/" + slow.id;
  const expired = await adminArticle(new Request(statusUrl), db, images, new URL(statusUrl).pathname);
  assert.equal((await expired.json()).status, "expired");
  const retryAfterExpiry = await (await publish(2, dispatch, slowDraft)).json();
  assert.notEqual(retryAfterExpiry.id, slow.id);
  assert.equal(await finishPublication(db, images, slow.id, slowInput.job.source_sha256, proof.output), "unknown");
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, id);
  const stagedEnv = { ...validationEnv, PUBLICATION_RECEIPT_KEY: "r".repeat(43) };
  const splitUrl = origin + "/internal/publication/" + retryAfterExpiry.id;
  const splitHeaders = { Authorization: "Bearer " + stagedEnv.VALIDATION_TOKEN,
    "X-Source-SHA256": slowInput.job.source_sha256 };
  const stage = await validationCallback(new Request(splitUrl + "/stage", {
    method: "POST", headers: { ...splitHeaders, "Content-Type": "image/webp" }, body: proof.output,
  }), stagedEnv);
  assert.equal(stage.status, 200);
  const receipt = await stage.json();
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, id);
  // The runner can repeat the transfer if the first receipt was lost.
  const repeatedStage = await validationCallback(new Request(splitUrl + "/stage", {
    method: "POST", headers: { ...splitHeaders, "Content-Type": "image/webp" }, body: proof.output,
  }), stagedEnv);
  assert.equal(repeatedStage.status, 200);
  assert.deepEqual(await repeatedStage.json(), receipt);
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, id);
  const wrongSource = { ...splitHeaders, "X-Source-SHA256": "0".repeat(64) };
  const wrongStage = await validationCallback(new Request(splitUrl + "/stage", {
    method: "POST", headers: { ...wrongSource, "Content-Type": "image/webp" }, body: proof.output,
  }), stagedEnv);
  assert.equal(wrongStage.status, 200);
  const wrongReceipt = await wrongStage.json();
  const wrongCommit = await validationCallback(new Request(splitUrl + "/commit", {
    method: "POST", headers: { ...wrongSource, "X-Result-SHA256": wrongReceipt.digest,
      "X-Publication-Receipt": wrongReceipt.receipt },
  }), stagedEnv);
  assert.equal(wrongCommit.status, 409);
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, id);
  const commit = (digest) => validationCallback(new Request(splitUrl + "/commit", {
    method: "POST", headers: { ...splitHeaders, "X-Result-SHA256": digest, "X-Publication-Receipt": receipt.receipt },
  }), stagedEnv);
  assert.equal((await commit("0".repeat(64))).status, 409);
  assert.equal((await commit(receipt.digest)).status, 200);
  assert.equal((await commit(receipt.digest)).status, 200);
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, retryAfterExpiry.id);
  const version = sqlite.prepare("SELECT version FROM article_state").get().version;
  const staticJob = await (await publish(version, dispatch, slowDraft)).json();
  const staticUrl = origin + "/internal/publication/" + staticJob.id + "/static-deployed";
  const acknowledge = (sourceHash, env = staticEnv) => validationCallback(new Request(staticUrl, {
    method: "POST", headers: { ...splitHeaders, "X-Source-SHA256": sourceHash },
  }), env);
  assert.equal((await acknowledge("0".repeat(64))).status, 409);
  assert.equal((await acknowledge(slowInput.job.source_sha256, validationEnv)).status, 404);
  assert.equal((await acknowledge(slowInput.job.source_sha256)).status, 204);
  assert.equal((await acknowledge(slowInput.job.source_sha256)).status, 204);
  const staticStatusUrl = new URL(origin + "/api/articles/jobs/" + staticJob.id);
  const staticStatus = await adminArticle(new Request(staticStatusUrl), db, images, staticStatusUrl.pathname);
  assert.equal((await staticStatus.json()).status, "published");
  assert.equal(sqlite.prepare("SELECT revision_id FROM article_state").get().revision_id, retryAfterExpiry.id);
  console.log("Handlers article : demande durable, dérivé privé, publication, panne KV, rejeu et résultat périmé vérifiés.");
} finally {
  sqlite.close();
}
