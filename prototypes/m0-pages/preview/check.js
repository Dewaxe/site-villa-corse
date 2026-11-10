import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const origin = process.env.M0_PAGES_ORIGIN ?? "http://127.0.0.1:8792";
const path = "/articles/article-test";
const routes = JSON.parse(await readFile(new URL("./public/_routes.json", import.meta.url)));
assert.equal(routes.version, 1);
assert.deepEqual(routes.include, [
  "/api", "/api/*", "/admin", "/admin/*", path, path + "/", "/media/article/*",
]);
assert.deepEqual(routes.exclude, []);
const backup = process.argv[2];
assert.match(backup ?? "", /^[a-z0-9][a-z0-9-]{0,79}$/);
const manifest = JSON.parse(await readFile(new URL("../backups/" + backup + "/manifest.json", import.meta.url)));
const revision = manifest.revisions.find(({ id }) => id === manifest.pointer.revision_id);
assert.ok(revision);

async function check(url, { status, invoked, method = "GET" }) {
  const response = await fetch(origin + url, { method, redirect: "manual" });
  assert.equal(response.status, status, method + " " + url);
  assert.equal(response.headers.get("X-M0-Invoked"), invoked ? "1" : null, url);
  assert.match(response.headers.get("X-Robots-Tag") ?? "", /\bnoindex\b/, url);
  return response;
}

for (const asset of ["/", "/style.css"]) {
  await check(asset, { status: 200, invoked: false });
}
for (const endpoint of ["/api/health", "/api/health/"]) {
  assert.deepEqual(await (await check(endpoint, { status: 200, invoked: true })).json(), { ok: true });
}
for (const endpoint of ["/api", "/api/", "/api/session", "/admin", "/admin/"]) {
  await check(endpoint, { status: 403, invoked: true });
}
for (const endpoint of ["/api/login/verify", "/api/register/options", "/api/articles/draft", "/api/articles/publish"]) {
  await check(endpoint, { status: 403, invoked: true, method: "POST" });
}

const article = await check(path, { status: 200, invoked: true });
assert.match(article.headers.get("Content-Type"), /^text\/html/);
const html = await article.text();
assert.ok(html.includes("<title>" + revision.title + "</title>"));
assert.ok(html.includes('<link rel="canonical" href="' + origin + path + '">'));
assert.ok(html.includes('/media/article/' + revision.id + '.webp'));
assert.ok(!html.includes("<script"));
const head = await check(path, { status: 200, invoked: true, method: "HEAD" });
assert.equal(await head.text(), "");
const redirect = await check(path + "/", { status: 308, invoked: true });
assert.equal(redirect.headers.get("Location"), path);

const image = await check("/media/article/" + revision.id + ".webp", { status: 200, invoked: true });
assert.equal(image.headers.get("Content-Type"), "image/webp");
assert.equal(createHash("sha256").update(Buffer.from(await image.arrayBuffer())).digest("hex"), revision.sha256);
await check("/media/article/00000000-0000-4000-8000-000000000000.webp", { status: 404, invoked: true });
console.log("Pages : fichiers statiques, article D1/KV, noindex et administration fermée vérifiés.");
