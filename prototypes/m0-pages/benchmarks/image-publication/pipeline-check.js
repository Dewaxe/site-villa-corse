import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createPublication } from "./publication.js";
import { processImage } from "./processor.js";

const admin = randomBytes(32).toString("base64url");
const worker = randomBytes(32).toString("base64url");
const publication = createPublication();
const tasks = new Map();
let origin;

async function run(id) {
  const response = await fetch(origin + "/input/" + id, { headers: { Authorization: worker } });
  assert.equal(response.status, 200);
  const proof = await processImage(id, Buffer.from(await response.arrayBuffer()));
  if (!proof) return "invalid";
  const result = await fetch(origin + "/result/" + id, {
    method: "POST",
    headers: { Authorization: worker, "Content-Type": "application/json" },
    body: JSON.stringify({ ...proof, output: Buffer.from(proof.output).toString("base64") }),
  });
  assert.equal(result.status, 200);
  return result.text();
}

const server = createServer(async (request, response) => {
  const reply = (status, text = "") => { response.writeHead(status, { "Cache-Control": "no-store" }); response.end(text); };
  try {
    const path = new URL(request.url, origin).pathname;
    const expected = path === "/publish" ? admin : worker;
    if (request.headers.authorization !== expected) return reply(401);
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 400_000) return reply(413);
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    if (path === "/publish" && request.method === "POST") {
      const id = randomUUID();
      publication.request(id, body);
      // Dispatch automatically after the admin's request.
      tasks.set(id, run(id).catch(() => "failed"));
      return reply(202, id);
    }
    const [, type, id] = path.split("/");
    const job = publication.read(id);
    if (!job) return reply(404);
    if (type === "input" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "no-store" });
      return response.end(job.bytes);
    }
    if (type === "result" && request.method === "POST") {
      const proof = JSON.parse(body.toString());
      if (proof.id !== id) return reply(409);
      proof.output = Buffer.from(proof.output, "base64");
      return reply(200, publication.complete(proof));
    }
    return reply(404);
  } catch {
    reply(503);
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
origin = "http://127.0.0.1:" + server.address().port;
try {
  const bytes = await readFile(new URL("../../.wrangler/webp-decoder/fixtures/small.bin", import.meta.url));
  assert.equal((await fetch(origin + "/publish", { method: "POST", body: bytes })).status, 401);
  const response = await fetch(origin + "/publish", {
    method: "POST", headers: { Authorization: admin }, body: bytes,
  });
  assert.equal(response.status, 202);
  const id = await response.text();
  assert.equal(await tasks.get(id), "published");
  const job = publication.read(id);
  assert.equal(publication.current().revision, id);
  assert.ok(job.output.length > 0 && job.output.length <= 250_000);
  assert.notDeepEqual(Buffer.from(job.output), bytes);
  assert.equal((await fetch(origin + "/input/" + id)).status, 401);
  assert.equal(publication.complete({
    id, sourceSha256: "invalid", sha256: "invalid", output: bytes,
  }), "mismatch");
  const bad = Buffer.from(bytes);
  const chunk = 10 + (bad.readUIntLE(20, 3) >>> 5);
  const corrupt = Buffer.concat([bad.subarray(0, 20 + chunk), Buffer.alloc(chunk % 2)]);
  corrupt.writeUInt32LE(corrupt.length - 8, 4);
  corrupt.writeUInt32LE(chunk, 16);
  const rejected = await fetch(origin + "/publish", {
    method: "POST", headers: { Authorization: admin }, body: corrupt,
  });
  const badId = await rejected.text();
  assert.equal(await tasks.get(badId), "failed");
  assert.equal(publication.current().revision, id);
  console.log("Un clic simulé : transfert privé, réencodage et publication automatiques réussis.");
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  publication.close();
}
