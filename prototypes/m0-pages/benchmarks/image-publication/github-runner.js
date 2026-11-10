import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
const proof = await processImage(id, bytes);
assert.ok(proof);
const result = await fetch(base + "/result", {
  method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
  headers: { Authorization: "Bearer " + token, "Content-Type": "image/webp", "X-Source-SHA256": digest },
  body: proof.output,
});
assert.equal(result.status, 200);
assert.ok(["published", "stale"].includes((await result.json()).status));
console.log("Traitement de publication terminé.");
