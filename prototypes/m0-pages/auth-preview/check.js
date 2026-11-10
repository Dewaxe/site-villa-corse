import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { onRequest } from "./functions/[[path]].js";

const { PROBE_ORIGIN: origin, PROBE_TOKEN: token, INVITE_A: invite } = process.env;
assert.match(origin ?? "", /^(https:\/\/[a-z\d-]+\.[a-z\d-]+\.pages\.dev|http:\/\/localhost:\d+)$/);
assert.match(token ?? "", /^[A-Za-z0-9_-]{43}$/);
assert.match(invite ?? "", /^[A-Za-z0-9_-]{43}$/);
const auth = { Authorization: "Bearer " + token };
const request = (path, options = {}) => fetch(origin + path, { ...options, redirect: "error" });
const startedAt = new Date().toISOString();

const expired = await onRequest({
  request: new Request(origin + "/probe", { headers: auth }),
  env: { PROBE_ORIGIN: origin, PROBE_TOKEN: token, PROBE_UNTIL: String(Date.now() - 1) },
});
assert.equal(expired.status, 404);

for (const [path, method, headers] of [
  ["/probe", "GET", {}],
  ["/probe", "GET", { Authorization: "Bearer " + "x".repeat(43) }],
  ["/api/login/options", "POST", { Origin: origin }],
  ["/api/articles/draft", "GET", auth],
]) {
  const denied = await request(path, { method, headers });
  assert.equal(denied.status, 404);
  assert.match(denied.headers.get("X-Robots-Tag") ?? "", /noindex/);
}

const blockedUpload = await request("/api/articles/draft", { method: "POST", headers: auth });
assert.ok([404, 405].includes(blockedUpload.status));

const browser = await chromium.launch({ channel: "msedge" });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", { options: {
    protocol: "ctap2", transport: "internal", hasResidentKey: true,
    hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
  } });
  await page.route(origin + "/probe", (route) =>
    route.continue({ headers: { ...route.request().headers(), authorization: auth.Authorization } }));
  const entry = await page.goto(origin + "/probe");
  assert.equal(entry.status(), 200);
  assert.match(entry.headers()["x-robots-tag"], /noindex/);
  await page.unroute(origin + "/probe");

  const statuses = await page.evaluate(async ({ token, invite }) => {
    const account = "demo-a";
    const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
    const call = (path, body) => fetch(path, {
      method: body ? "POST" : "GET", headers, redirect: "error",
      body: body ? JSON.stringify(body) : undefined,
    });
    const options = async (path, input) => {
      const response = await call(path, input);
      if (!response.ok) throw new Error(path + " " + response.status);
      return response.json();
    };

    const enroll = await options("/api/register/options", { account, invite });
    const key = await navigator.credentials.create({
      publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(enroll),
    });
    const registered = await call("/api/register/verify", {
      account, invite, challenge: enroll.challenge, response: key.toJSON(),
    });
    if (!registered.ok) throw new Error("Inscription " + registered.status);

    const assertions = [];
    for (let i = 0; i < 8; i++) {
      const login = await options("/api/login/options", { account });
      const assertion = await navigator.credentials.get({
        publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(login),
      });
      assertions.push({ account, challenge: login.challenge, response: assertion.toJSON() });
    }

    // Keep the verify-only window separate at the API's one-second resolution.
    const pause = () => new Promise((resolve) => setTimeout(resolve, 2100));
    await pause();
    const verifyFrom = new Date().toISOString();
    const logins = [];
    for (const assertion of assertions) {
      logins.push((await call("/api/login/verify", assertion)).status);
    }
    const verifyUntil = new Date().toISOString();
    await pause();

    const session = await call("/api/session");
    const profile = await session.json();
    const replay = await call("/api/login/verify", assertions.at(-1));
    const logout = await call("/api/logout", {});
    const afterLogout = await call("/api/session");
    return {
      verifyFrom, verifyUntil,
      outcomes: { registered: registered.status, logins, profile, replay: replay.status,
        logout: logout.status, afterLogout: afterLogout.status },
    };
  }, { token, invite });
  assert.deepEqual(statuses.outcomes, {
    registered: 200, logins: Array(8).fill(200), profile: { account: "demo-a", role: "demo-admin" },
    replay: 401, logout: 200, afterLogout: 401,
  });
  console.log(JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), ...statuses }));
} finally {
  await browser.close();
}
