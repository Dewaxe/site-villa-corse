import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";

const { PROBE_ORIGIN: origin, PROBE_TOKEN: token } = process.env;
assert.match(origin ?? "", /^https:\/\/[a-z\d-]+\.[a-z\d-]+\.pages\.dev$/);
assert.match(token ?? "", /^[\w-]{43}$/);
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const { x, y } = publicKey.export({ format: "jwk" });
const cose = Buffer.concat([
  Buffer.from("a5010203262001215820", "hex"), Buffer.from(x, "base64url"),
  Buffer.from("225820", "hex"), Buffer.from(y, "base64url"),
]);
const hash = (data) => createHash("sha256").update(data).digest();
const id = randomBytes(16).toString("base64url");
const challenge = randomBytes(32).toString("base64url");
const clientData = Buffer.from(JSON.stringify({ type: "webauthn.get", origin, challenge }));
const authenticatorData = Buffer.concat([hash(new URL(origin).hostname), Buffer.from([5, 0, 0, 0, 0])]);
const signature = sign("sha256", Buffer.concat([authenticatorData, hash(clientData)]), privateKey);
const payload = {
  challenge, publicKey: cose.toString("base64url"),
  assertion: { id, rawId: id, type: "public-key", clientExtensionResults: {}, response: {
    clientDataJSON: clientData.toString("base64url"),
    authenticatorData: authenticatorData.toString("base64url"),
    signature: signature.toString("base64url"),
  } },
};
const call = async (body, authorized = true) => (await fetch(origin + "/probe/crypto", {
  method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
  headers: { "Content-Type": "application/json", ...(authorized && { Authorization: "Bearer " + token }) },
  body: JSON.stringify(body),
})).status;
assert.equal(await call(payload, false), 404);
assert.equal(await call({ ...payload, challenge: randomBytes(32).toString("base64url") }), 401);
assert.equal(await call(payload), 204);
await new Promise((resolve) => setTimeout(resolve, 2200));
const from = new Date().toISOString();
for (let i = 0; i < 24; i++) assert.equal(await call(payload), 204);
console.log(JSON.stringify({ windows: { signature: { from, until: new Date().toISOString(), requests: 24 } } }));
