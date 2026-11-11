import assert from "node:assert/strict";
import { test } from "node:test";
import { readBoundedBytes, readJson, requestErrorStatus } from "./request-limits.js";

function jsonRequest(body, headers = {}) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
    duplex: "half",
  });
}

test("JSON déclaré trop grand : 413", async () => {
  await assert.rejects(readJson(jsonRequest("{}", { "Content-Length": "1025" }), 1024),
    (error) => requestErrorStatus(error) === 413);
});

test("Le flux sans Content-Length est coupé après le plafond réel", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(600)); },
    cancel() { cancelled = true; },
  });
  const request = jsonRequest(stream);
  assert.equal(request.headers.get("Content-Length"), null);
  await assert.rejects(readJson(request, 1024), (error) => requestErrorStatus(error) === 413);
  assert.equal(cancelled, true);
});

test("JSON valide et type invalide sont distingués", async () => {
  assert.deepEqual(await readJson(jsonRequest('{"ok":true}')), { ok: true });
  await assert.rejects(readJson(jsonRequest("{}", { "Content-Type": "text/plain" })),
    (error) => requestErrorStatus(error) === 400);
});

test("Le lecteur binaire réunit les segments et contrôle la taille réelle", async () => {
  function segmentedRequest() {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(Uint8Array.of(1, 2));
        controller.enqueue(Uint8Array.of(3, 4));
        controller.close();
      },
    });
    return jsonRequest(stream, { "Content-Length": "2" });
  }

  assert.deepEqual(await readBoundedBytes(segmentedRequest(), 4), Uint8Array.of(1, 2, 3, 4));
  await assert.rejects(readBoundedBytes(segmentedRequest(), 3),
    (error) => requestErrorStatus(error) === 413);
});
