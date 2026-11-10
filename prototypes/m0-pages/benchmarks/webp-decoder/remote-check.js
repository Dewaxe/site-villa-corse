import assert from "node:assert/strict";

const { PROBE_ORIGIN: origin, PROBE_TOKEN: token } = process.env;
assert.match(origin ?? "", /^https:\/\/[a-z\d-]+\.[a-z\d-]+\.pages\.dev$/);
assert.match(token ?? "", /^[A-Za-z0-9_-]{43}$/);
const send = async (route, authorized = true, method = "GET") =>
  (await fetch(origin + route, {
    method, redirect: "error", signal: AbortSignal.timeout(10_000),
    headers: authorized ? { Authorization: "Bearer " + token } : {},
  })).status;

assert.equal(await send("/decode-small", false), 404);
assert.equal(await send("/decode-large", true, "POST"), 404);
const windows = {};
for (const size of ["small", "large"]) {
  await new Promise((resolve) => setTimeout(resolve, 2200));
  const from = new Date().toISOString();
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push(await send("/decode-" + size));
  windows[size] = { from, until: new Date().toISOString(), requests: statuses.length, statuses };
}
console.log(JSON.stringify({ windows }));
