import { checkQuota } from "./quota-check.js";
import { checkArticle } from "./article-check.js";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { chromium } from "playwright-core";

const origin = "http://localhost:8791";
const cookieName = "__Host-m0_session";
const inviteFile = process.env.M0_INVITES_FILE ?? new URL("./.dev.vars", import.meta.url);
const invites = parseEnv(await readFile(inviteFile, "utf8"));
const browser = await chromium.launch({ channel: "msedge" });
const results = [];

try {
  for (const [account, invite] of [["demo-a", invites.INVITE_A], ["demo-b", invites.INVITE_B]]) {
    assert.match(invite, /^[A-Za-z0-9_-]{43}$/);
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    const addAuthenticator = (transport) => cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport,
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
    const { authenticatorId: primary } = await addAuthenticator("internal");

    await page.goto(origin);
    const sessionUrl = origin + "/api/session";
    assert.equal((await context.request.get(sessionUrl)).status(), 401);
    const status = page.locator("#status");
    const waitForStatus = (message) => status.getByText(message, { exact: true }).waitFor({ timeout: 5_000 });
    await page.selectOption("#account", account);
    await page.fill("#invite", "invalid");
    await page.click("#register");
    await waitForStatus("Accès refusé.");

    await page.fill("#invite", invite);
    await page.click("#register");
    await waitForStatus("Clé ajoutée.");
    assert.equal((await context.request.get(sessionUrl)).status(), 401);

    const attempts = [];
    await page.route("**/api/login/verify", async (route) => {
      const payload = route.request().postDataJSON();
      const submit = () => context.request.post(origin + "/api/login/verify", {
        data: payload, headers: { Origin: origin },
      });
      const replies = await Promise.all([submit(), submit()]);
      attempts.push(...replies.map((reply) => reply.status()).sort());
      await route.fulfill({ response: replies.find((reply) => reply.ok()) ?? replies[0] });
    });

    await page.click("#login");
    await waitForStatus(`Session ouverte pour ${account}.`);
    assert.deepEqual(attempts, [200, 401]);
    assert.deepEqual(await (await context.request.get(sessionUrl)).json(), { account, role: "demo-admin" });

    const getSessionCookie = async () => (await context.cookies(origin)).find(({ name }) => name === cookieName);
    const firstCookie = await getSessionCookie();
    assert.ok(firstCookie?.httpOnly && firstCookie.secure && firstCookie.sameSite === "Strict");

    // The UI still shows the previous success message, so wait for the new request.
    await page.unroute("**/api/login/verify");
    const [relogin] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/login/verify")),
      page.click("#login"),
    ]);
    assert.equal(relogin.status(), 200);
    let sessionCookie = await getSessionCookie();
    assert.ok(sessionCookie && sessionCookie.value !== firstCookie.value);
    const replaced = await fetch(sessionUrl, { headers: { Cookie: `${cookieName}=${firstCookie.value}` } });
    assert.equal(replaced.status, 401);
    const rejectedLogout = await context.request.post(origin + "/api/logout", {
      headers: { Origin: "http://wrong.invalid" }, data: {},
    });
    assert.equal(rejectedLogout.status(), 401);
    assert.equal((await context.request.get(sessionUrl)).status(), 200);

    if (account === "demo-a") {
      const post = (path, data) => context.request.post(origin + path, { data, headers: { Origin: origin } });
      const { credentials: [lost] } = await cdp.send("WebAuthn.getCredentials", { authenticatorId: primary });
      const lostId = Buffer.from(lost.credentialId, "base64").toString("base64url");
      const localState = process.env.M0_SESSION_STATE;
      if (localState) {
        assert.match(localState, /^ci-[0-9a-f]{32}-source$/);
        execFileSync(process.execPath, [
          "node_modules/wrangler/bin/wrangler.js", "d1", "execute", "DB", "--local",
          "--persist-to", ".wrangler/" + localState, "--config", "benchmarks/session/wrangler.jsonc",
          "--command", "UPDATE sessions SET authenticated_at = 0 WHERE account = 'demo-a'",
        ], { stdio: "pipe", windowsHide: true });
        assert.equal((await context.request.get(sessionUrl)).status(), 200);
        assert.equal((await post("/api/keys/options", {})).status(), 403);
        assert.equal((await post("/api/keys/revoke", { id: lostId })).status(), 403);

        const [stepUp] = await Promise.all([
          page.waitForResponse((response) => response.url().endsWith("/api/login/verify")),
          page.click("#login"),
        ]);
        assert.equal(stepUp.status(), 200);
        sessionCookie = await getSessionCookie();
      }
      const lastKey = await post("/api/keys/revoke", { id: lostId });
      assert.equal(lastKey.status(), 409);

      // Capture a valid assertion before the loss to test rejection after revocation.
      const options = await (await post("/api/login/options", { account })).json();
      const oldAssertion = await page.evaluate(async (options) => {
        const credential = await navigator.credentials.get({
          publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
        });
        return credential.toJSON();
      }, options);

      await cdp.send("WebAuthn.setAutomaticPresenceSimulation", { authenticatorId: primary, enabled: false });
      const { authenticatorId: backup } = await addAuthenticator("usb");
      await page.click("#backup");
      await waitForStatus("Clé de secours ajoutée.");
      const { credentials: [spare] } = await cdp.send("WebAuthn.getCredentials", { authenticatorId: backup });
      const spareId = Buffer.from(spare.credentialId, "base64").toString("base64url");

      await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId: primary });
      const lostCookie = sessionCookie;
      await context.clearCookies();
      assert.equal((await context.request.get(sessionUrl)).status(), 401);
      const anonymousBackup = await post("/api/keys/options", {});
      assert.equal(anonymousBackup.status(), 401);

      const [recovered] = await Promise.all([
        page.waitForResponse((response) => response.url().endsWith("/api/login/verify")),
        page.click("#login"),
      ]);
      assert.equal(recovered.status(), 200);
      await waitForStatus(`Session ouverte pour ${account}.`);
      sessionCookie = await getSessionCookie();
      assert.ok(sessionCookie && sessionCookie.value !== lostCookie.value);

      const oldSession = () => fetch(sessionUrl, {
        headers: { Cookie: `${cookieName}=${lostCookie.value}` },
      });
      assert.equal((await oldSession()).status, 200);

      await page.click("#list");
      await waitForStatus("Clés chargées.");
      await page.selectOption("#keys", lostId);
      await page.click("#revoke");
      await waitForStatus("Clé révoquée.");
      assert.equal((await oldSession()).status, 401);
      assert.equal((await context.request.get(sessionUrl)).status(), 200);
      const stale = await post("/api/login/verify", {
        account, challenge: options.challenge, response: oldAssertion,
      });
      assert.equal(stale.status(), 401);
      assert.deepEqual(await (await context.request.get(origin + "/api/keys")).json(), [spareId]);
      assert.equal((await post("/api/keys/revoke", { id: spareId })).status(), 409);
    }

    if (account === "demo-a") {
      await checkArticle(page, context, waitForStatus);
      await checkQuota(page, context, origin);
    }

    await page.click("#logout");
    await waitForStatus("Session révoquée.");
    assert.equal((await context.request.get(sessionUrl)).status(), 401);
    const revoked = await fetch(sessionUrl, { headers: { Cookie: `${cookieName}=${sessionCookie.value}` } });
    assert.equal(revoked.status, 401);
    if (account === "demo-b") {
      const authPost = (data) => context.request.post(origin + "/api/register/options", {
        headers: { Origin: origin }, data,
      });
      assert.equal((await authPost({ account, filler: "x".repeat(16_384) })).status(), 413);
      const requests = await Promise.all(
        Array.from({ length: 16 }, () => authPost({ account, invite: "invalid" })),
      );
      assert.ok(requests.some((response) => response.status() === 429));
      assert.ok(requests.every((response) => [401, 429].includes(response.status())));
      const limited = await authPost({ account, invite: "invalid" });
      assert.equal(limited.status(), 429);
      assert.equal(limited.headers()["retry-after"], "60");
      assert.equal((await authPost({ account: "demo-a", invite: "invalid" })).status(), 401);
      assert.equal((await authPost({ account: "unknown", invite: "invalid" })).status(), 401);
    }
    await context.close();
    results.push(account);
  }
} finally {
  await browser.close();
}

console.log(`Edge et D1 local : ${results.length} comptes validés, récupération et révocation vérifiées pour demo-a.`);
