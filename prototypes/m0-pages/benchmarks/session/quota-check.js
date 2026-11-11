import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routes = JSON.parse(await readFile(new URL("../../preview/public/_routes.json", import.meta.url)));
const match = (path, rule) => rule.endsWith("*") ? path.startsWith(rule.slice(0, -1)) : path === rule;
const dynamic = (path) => routes.include.some((rule) => match(path, rule)) &&
  !routes.exclude.some((rule) => match(path, rule));

export async function checkQuota(page, context, origin) {
  const stateUrl = origin + "/api/articles";
  const before = await context.request.get(stateUrl);
  assert.equal(before.status(), 200);
  const state = await before.json();
  assert.ok(state.revision_id);
  const calls = [];
  const selected = (url) => url.origin === origin && dynamic(url.pathname);
  const deny = async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    assert.match(headers.cookie ?? "", /__Host-m0_session=/);
    calls.push(new URL(request.url()).pathname);
    await route.fulfill({ status: 503, body: "Invocation indisponible (simulation)" });
  };

  const endpoints = [
    ["/api/session", "GET"],
    ["/api/articles", "GET"],
    ["/api/articles/draft", "POST"],
    ["/api/articles/publish", "POST"],
    ["/admin", "GET"],
    ["/admin/", "GET"],
    ["/articles/article-test", "GET"],
    ["/media/article/" + state.revision_id + ".webp", "GET"],
  ];
  await page.route(selected, deny);
  try {
    for (const [path, method] of endpoints) {
      const { status, text } = await page.evaluate(async ({ path, method, state }) => {
        const options = method === "POST" ? {
          method, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: state.revision_id, version: state.version }),
        } : { method };
        const response = await fetch(path, options);
        return { status: response.status, text: await response.text() };
      }, { path, method, state });
      assert.equal(status, 503, path);
      assert.equal(text, "Invocation indisponible (simulation)", path);
    }
    assert.equal(await page.evaluate(async () => (await fetch("/client.js")).status), 200);
    assert.deepEqual(calls, endpoints.map(([path]) => path));
  } finally {
    await page.unroute(selected, deny);
  }
  const after = await context.request.get(stateUrl);
  assert.equal(after.status(), 200);
  assert.deepEqual(await after.json(), state);
  console.log("T-062 simulé : session valide, routes Functions fermées, JavaScript statique servi et données inchangées.");
}
