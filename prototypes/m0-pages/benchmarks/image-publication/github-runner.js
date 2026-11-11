import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { buildStaticRelease } from "./static-release.js";
import { processImage } from "./processor.js";

const { PUBLICATION_ORIGIN: origin, PUBLICATION_TOKEN: token, PUBLICATION_JOB: id } = process.env;
assert.match(origin ?? "", /^https:\/\/[a-z\d-]+\.[a-z\d-]+\.pages\.dev$/);
assert.match(token ?? "", /^[A-Za-z0-9_-]{43}$/);
assert.match(id ?? "", /^[0-9a-f-]{36}$/);
const base = origin + "/internal/publication/" + id;
const source = await fetch(base + "/input", {
  redirect: "error", headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(20_000),
});
assert.equal(source.status, 200);
const bytes = Buffer.from(await source.arrayBuffer());
assert.ok(bytes.length <= 250_000);
const digest = createHash("sha256").update(bytes).digest("hex");
assert.equal(digest, source.headers.get("X-Source-SHA256"));
if (process.env.PUBLICATION_STATIC === "1") {
  const manifest = await fetch(base + "/manifest", {
    redirect: "error", headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(20_000),
  });
  assert.equal(manifest.status, 200);
  const revision = await manifest.json();
  assert.equal(revision.source_sha256, digest);
  const release = await buildStaticRelease(process.env.RUNNER_TEMP, process.env.STATIC_ORIGIN, revision, bytes);
  if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `M0_STATIC_SOURCE_SHA256=${digest}\n`);
  console.log(release);
  process.exit(0);
}
let proof;
try {
  proof = await processImage(id, bytes);
  assert.ok(proof);
} catch {
  const failure = await fetch(base + "/failure", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: "Bearer " + token, "X-Source-SHA256": digest },
  });
  assert.equal(failure.status, 204);
  throw new Error("Image refusée au décodage ou au réencodage.");
}
const split = process.env.PUBLICATION_SPLIT === "1";
const result = await fetch(base + (split ? "/stage" : "/result"), {
  method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
  headers: { Authorization: "Bearer " + token, "Content-Type": "image/webp", "X-Source-SHA256": digest },
  body: proof.output,
});
assert.equal(result.status, 200);
let publication = await result.json();
if (split) {
  assert.equal(publication.digest, proof.sha256);
  assert.match(publication.receipt, /^[0-9a-f]{64}$/);
  const committed = await fetch(base + "/commit", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: "Bearer " + token, "X-Source-SHA256": digest,
      "X-Result-SHA256": publication.digest, "X-Publication-Receipt": publication.receipt },
  });
  assert.equal(committed.status, 200);
  publication = await committed.json();
}
assert.ok(["published", "stale"].includes(publication.status));
console.log("Traitement de publication terminé.");
