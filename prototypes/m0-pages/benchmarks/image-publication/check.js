import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPublication, digest } from "./publication.js";
import { isDemoWebP } from "../session/webp.js";

const dir = new URL("../../.wrangler/webp-decoder/", import.meta.url);
const binary = await readFile(new URL("wasm32-unknown-unknown/release/m0_webp_decoder.wasm", dir));
const { instance } = await WebAssembly.instantiate(binary);
const { memory, prepare_input, decode_input } = instance.exports;

async function validate(id, bytes) {
  if (!(await isDemoWebP(new File([bytes], id, { type: "image/webp" })))) return null;
  const offset = prepare_input(bytes.byteLength);
  new Uint8Array(memory.buffer, offset, bytes.byteLength).set(bytes);
  return decode_input() ? { id, sha256: digest(bytes) } : null;
}

const small = await readFile(new URL("fixtures/small.bin", dir));
const large = await readFile(new URL("fixtures/large.bin", dir));
const firstPartition = 10 + (small.readUIntLE(20, 3) >>> 5);
const truncated = Buffer.concat([small.subarray(0, 20 + firstPartition), Buffer.alloc(firstPartition % 2)]);
truncated.writeUInt32LE(truncated.length - 8, 4);
truncated.writeUInt32LE(firstPartition, 16);
assert.equal(await isDemoWebP(new File([truncated], "truncated.webp", { type: "image/webp" })), true);

const publication = createPublication();
try {
  publication.request("corrupt", truncated);
  assert.equal(await publication.process("corrupt", validate), "invalid");

  publication.request("interrupted", small);
  await assert.rejects(publication.process("interrupted", async () => {
    throw new Error("Validateur indisponible");
  }), /indisponible/);
  assert.equal(publication.read("interrupted").status, "pending");
  assert.equal(publication.current().revision, "initial");

  publication.request("older", small);
  publication.request("newer", large);
  const oldProof = await validate("older", publication.read("older").bytes);
  const newProof = await validate("newer", publication.read("newer").bytes);
  assert.ok(oldProof && newProof);
  assert.equal(publication.complete({ ...newProof, sha256: oldProof.sha256 }), "mismatch");
  assert.equal(publication.current().revision, "initial");
  assert.equal(publication.complete(newProof), "published");
  assert.equal(publication.current().version, 2);
  assert.equal(publication.complete(newProof), "published");
  assert.equal(publication.current().version, 2);
  assert.equal(publication.complete(oldProof), "stale");
  assert.equal(publication.current().revision, "newer");

  const retryProof = await validate("interrupted", publication.read("interrupted").bytes);
  assert.equal(publication.complete(retryProof), "stale");
  assert.equal(publication.current().version, 2);
  publication.request("retry", small);
  await assert.rejects(publication.process("retry", async () => { throw new Error("Panne"); }), /Panne/);
  assert.equal(await publication.process("retry", validate), "published");
  assert.equal(await publication.process("retry", validate), "published");
  assert.equal(publication.current().version, 3);
  console.log("Publication différée : corrompu, interruption, substitution, rejeu et résultat ancien vérifiés.");
} finally {
  publication.close();
}
