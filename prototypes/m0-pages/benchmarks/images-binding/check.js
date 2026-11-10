import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { isDemoWebP } from "../session/webp.js";
import worker from "./worker.js";

const endpoint = "http://127.0.0.1:8795/transform";
const large = await readFile(new URL("../../.wrangler/webp-decoder/fixtures/large.bin", import.meta.url));
const send = (body, type = "image/webp") =>
  fetch(endpoint, { method: "POST", headers: { "Content-Type": type }, body });

const small = await readFile(new URL("../../.wrangler/webp-decoder/fixtures/small.bin", import.meta.url));
const transformed = await send(small);
assert.equal(transformed.status, 200);
const bytes = await transformed.arrayBuffer();
assert.equal(await isDemoWebP(new File([bytes], "result.webp", { type: transformed.headers.get("Content-Type") })), true);

const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  const dimensions = await page.evaluate(async (bytes) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(bytes)], { type: "image/webp" }));
    const size = [image.width, image.height];
    image.close();
    return size;
  }, [...new Uint8Array(bytes)]);
  assert.deepEqual(dimensions, [320, 320]);
} finally {
  await browser.close();
}

const size = 10 + (large.readUIntLE(20, 3) >>> 5);
const truncated = Buffer.concat([large.subarray(0, 20 + size), Buffer.alloc(size % 2)]);
truncated.writeUInt32LE(truncated.length - 8, 4);
truncated.writeUInt32LE(size, 16);
assert.equal(await isDemoWebP(new File([truncated], "bad.webp", { type: "image/webp" })), true);
const rejected = await send(truncated);
assert.ok([422, 503].includes(rejected.status), "Le flux tronqué ne doit pas passer le banc local");
assert.equal((await send(large, "image/png")).status, 400);
assert.equal((await send(large)).status, 422);

for (const failure of ["quota", "panne"]) {
  const input = () => ({ output() { throw new Error(failure); } });
  const request = new Request(endpoint, { method: "POST", headers: { "Content-Type": "image/webp" }, body: small });
  assert.equal((await worker.fetch(request, { IMAGES: { input } })).status, 503);
}
assert.equal((await send(Buffer.alloc(250_001))).status, 413);
assert.equal((await fetch(endpoint)).status, 404);
console.log("WebP local valide : " + bytes.byteLength + " octets, 320 × 320 ; tronqué : " + rejected.status + ".");
