import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { chromium } from "playwright-core";

const origin = "http://localhost:8791";
const cookieName = "__Host-m0_session";
const invites = parseEnv(await readFile(new URL("./.dev.vars", import.meta.url), "utf8"));
const browser = await chromium.launch({ channel: "msedge" });
const results = [];

try {
  for (const [account, invite] of [["demo-a", invites.INVITE_A], ["demo-b", invites.INVITE_B]]) {
    assert.match(invite, /^[A-Za-z0-9_-]{43}$/);
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

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
    const sessionCookie = await getSessionCookie();
    assert.ok(sessionCookie && sessionCookie.value !== firstCookie.value);
    const replaced = await fetch(sessionUrl, { headers: { Cookie: `${cookieName}=${firstCookie.value}` } });
    assert.equal(replaced.status, 401);
    const rejectedLogout = await context.request.post(origin + "/api/logout", {
      headers: { Origin: "http://wrong.invalid" }, data: {},
    });
    assert.equal(rejectedLogout.status(), 401);
    assert.equal((await context.request.get(sessionUrl)).status(), 200);

    await page.click("#logout");
    await waitForStatus("Session révoquée.");
    assert.equal((await context.request.get(sessionUrl)).status(), 401);
    const revoked = await fetch(sessionUrl, { headers: { Cookie: `${cookieName}=${sessionCookie.value}` } });
    assert.equal(revoked.status, 401);
    await context.close();
    results.push(account);
  }
} finally {
  await browser.close();
}

console.log(`Edge et D1 local : parcours validé pour ${results.length} comptes fictifs.`);
