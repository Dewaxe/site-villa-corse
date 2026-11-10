import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { performance } from "node:perf_hooks";

const endpoint = "http://127.0.0.1:8790";
const origin = "http://localhost:8790";
const hash = (input) => createHash("sha256").update(input).digest();

async function post(path, body) {
  const response = await fetch(endpoint + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
  return { status: response.status, body: await response.json() };
}

async function makeFixture(account) {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const { x, y } = publicKey.export({ format: "jwk" });
  const id = randomBytes(16).toString("base64url");
  // COSE EC2 map: kty=EC2, alg=ES256, crv=P-256, then x and y.
  const cose = Buffer.concat([
    Buffer.from("a5010203262001215820", "hex"), Buffer.from(x, "base64url"),
    Buffer.from("225820", "hex"), Buffer.from(y, "base64url"),
  ]);
  const result = await post("/fixture", { account, id, publicKey: cose.toString("base64url") });
  assert.equal(result.status, 200);
  return { account, id, privateKey };
}

async function prepare(fixture, overrides = {}) {
  const issued = await post("/challenge", { account: fixture.account });
  assert.equal(issued.status, 200);
  const {
    challenge = issued.body.challenge, requestOrigin = origin, rpID = "localhost",
    flags = 0x05, privateKey = fixture.privateKey,
  } = overrides;
  const clientData = Buffer.from(JSON.stringify({
    type: "webauthn.get", challenge, origin: requestOrigin, crossOrigin: false,
  }));
  // rpIdHash, user-present/user-verified flags, and a zero counter.
  const authenticatorData = Buffer.concat([hash(rpID), Buffer.from([flags, 0, 0, 0, 0])]);
  const signature = sign("sha256", Buffer.concat([authenticatorData, hash(clientData)]), privateKey);
  return {
    account: fixture.account,
    assertion: {
      id: fixture.id,
      rawId: fixture.id,
      type: "public-key",
      clientExtensionResults: {},
      response: {
        clientDataJSON: clientData.toString("base64url"),
        authenticatorData: authenticatorData.toString("base64url"),
        signature: signature.toString("base64url"),
      },
    },
  };
}

const a = await makeFixture("demo-a");
const b = await makeFixture("demo-b");
for (const fixture of [a, b]) {
  const result = await post("/verify", await prepare(fixture));
  assert.deepEqual(result, { status: 200, body: { ok: true, role: "demo-admin" } });
}

for (const overrides of [
  { requestOrigin: "https://unexpected.invalid" },
  { rpID: "unexpected.invalid" },
  { challenge: randomBytes(32).toString("base64url") },
  { flags: 0x01 },
  { privateKey: b.privateKey },
]) {
  const result = await post("/verify", await prepare(a, overrides));
  assert.equal(result.status, 401);
}

const assertion = await prepare(a);
const attempts = await Promise.all([post("/verify", assertion), post("/verify", assertion)]);
assert.deepEqual(attempts.map(({ status }) => status).sort(), [200, 401]);
assert.equal((await post("/verify", assertion)).status, 401);
console.log("Deux identités acceptées, cinq assertions invalides et rejeu refusés.");

const samples = [];
for (let index = 0; index < 10; index++) {
  const payload = await prepare(a);
  const start = performance.now();
  const result = await post("/verify", payload);
  samples.push(performance.now() - start);
  assert.equal(result.status, 200);
}
samples.sort((a, b) => a - b);
const median = (samples[4] + samples[5]) / 2;
console.log(`Vérification seule (HTTP local, n=10) : médiane ${median.toFixed(1)} ms, max ${samples.at(-1).toFixed(1)} ms.`);
