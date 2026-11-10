import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const origin = "http://127.0.0.1:8788";

test("T-060 : l’artefact inclut uniquement les routes prévues", async () => {
  const routes = JSON.parse(await readFile(
    new URL("./public/_routes.json", import.meta.url),
    "utf8",
  ));

  assert.equal(routes.version, 1);
  assert.deepEqual(routes.include, [
    "/api/health", "/api/health/", "/admin", "/admin/*",
  ]);
  assert.deepEqual(routes.exclude, []);
});

test("T-060 : le témoin dynamique répond, les fichiers statiques restent statiques", async () => {
  for (const path of ["/api/health", "/api/health/"]) {
    const response = await fetch(origin + path, { redirect: "manual" });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("X-M0-Invoked"), "1", path);
    assert.deepEqual(await response.json(), { ok: true });
  }

  for (const [path, marker] of [
    ["/", "Cette page est un fichier statique."],
    ["/style.css", "font-family: system-ui"],
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("X-M0-Invoked"), null, path);
    assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
    assert.ok((await response.text()).includes(marker));
  }
});

test("T-050 : l’admin et ses sous-routes refusent les requêtes", async () => {
  for (const [method, path] of [
    ["GET", "/admin"],
    ["GET", "/admin/"],
    ["GET", "/admin/draft"],
    ["POST", "/admin/publish"],
  ]) {
    const response = await fetch(origin + path, { method, redirect: "manual" });
    assert.equal(response.status, 403, path);
    assert.equal(response.headers.get("X-M0-Function"), "admin", path);
    assert.equal(response.headers.get("Cache-Control"), "no-store", path);
    assert.equal(await response.text(), "Accès indisponible");
  }
});
