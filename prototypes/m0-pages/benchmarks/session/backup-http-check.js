import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [action, backupName] = process.argv.slice(2);
assert.ok(["capture", "compare"].includes(action) && /^[a-z0-9][a-z0-9-]{0,79}$/.test(backupName ?? ""));
const project = fileURLToPath(new URL("../../", import.meta.url));
const folder = join(project, "backups", backupName);
const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8"));
const origin = "http://localhost:8791";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const page = await fetch(origin + "/articles/article-test");
assert.equal(page.status, 200);
const html = await page.text();
assert.ok(html.includes("/media/article/" + manifest.pointer.revision_id + ".webp"));

const images = [];
for (const revision of manifest.revisions) {
  const response = await fetch(origin + "/media/article/" + revision.id + ".webp");
  assert.equal(response.status, revision.published ? 200 : 404);
  if (!revision.published) continue;
  assert.equal(response.headers.get("Content-Type"), "image/webp");
  const digest = sha256(await response.arrayBuffer().then((bytes) => Buffer.from(bytes)));
  assert.equal(digest, revision.sha256);
  images.push(digest);
}

assert.equal((await fetch(origin + "/api/session")).status, 401);
const result = { html: sha256(html), images };
const capture = join(folder, "public-check.json");
if (action === "capture") {
  writeFileSync(capture, JSON.stringify(result), { flag: "wx" });
  console.log("Source HTTP enregistrée.");
} else {
  assert.deepEqual(result, JSON.parse(readFileSync(capture, "utf8")));
  console.log("Cible HTTP : HTML et images identiques à la source.");
}
