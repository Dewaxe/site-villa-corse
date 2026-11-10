import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const { TRANSFER_ORIGIN: origin, TRANSFER_TOKEN: token } = process.env;
assert.match(origin ?? "", /^https:\/\/[a-z\d-]+\.[a-z\d-]+\.pages\.dev$/);
assert.match(token ?? "", /^[A-Za-z0-9_-]{43}$/);
const headers = { Authorization: "Bearer " + token };
const denied = await fetch(origin + "/transfer-input", { redirect: "error" });
assert.equal(denied.status, 404);
const input = await fetch(origin + "/transfer-input", { headers, redirect: "error" });
assert.equal(input.status, 200);
const bytes = new Uint8Array(await input.arrayBuffer());
assert.ok(bytes.length > 0 && bytes.length <= 250_000);
const module = await readFile(".wrangler/webp-decoder/wasm32-unknown-unknown/release/m0_webp_decoder.wasm");
const { instance } = await WebAssembly.instantiate(module);
const { memory, prepare_input, decode_input } = instance.exports;
const offset = prepare_input(bytes.length);
new Uint8Array(memory.buffer, offset, bytes.length).set(bytes);
assert.equal(decode_input(), 1);
const sha256 = createHash("sha256").update(bytes).digest("hex");
for (let i = 0; i < 2; i++) {
  const result = await fetch(origin + "/transfer-result", {
    method: "POST", redirect: "error",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ sha256 }),
  });
  assert.equal(result.status, 204);
}
console.log(JSON.stringify({ authenticatedTransfer: true, decoded: true, idempotentResult: true }));
