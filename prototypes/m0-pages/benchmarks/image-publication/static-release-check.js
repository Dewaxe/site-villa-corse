import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { buildStaticRelease } from "./static-release.js";

const root = await mkdtemp(join(tmpdir(), "villa-m0-static-"));
const origin = "https://villa.example";
const revision = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Villa <test>", description: 'Une "description"', body: "Texte fictif.",
};
try {
  const source = await sharp({ create: { width: 320, height: 240, channels: 3, background: "#437085" } })
    .webp().toBuffer();
  const first = await buildStaticRelease(root, origin, revision, source);
  const article = join("articles", "article-test", "index.html");
  const html = await readFile(join(first, article), "utf8");
  assert.match(html, /<h1>Villa &lt;test&gt;<\/h1>/);
  assert.ok(html.includes(origin + "/articles/article-test"));
  assert.ok(html.includes(`/media/article/${revision.id}.webp`));
  const media = await readFile(join(first, "media", "article", revision.id + ".webp"));
  assert.equal((await sharp(media).raw().toBuffer()).length, 320 * 240 * 3);
  assert.deepEqual((await readdir(first)).sort(), ["404.html", "_headers", "articles", "media"]);
  assert.match(await readFile(join(first, "_headers"), "utf8"), /X-Robots-Tag: noindex/);
  await assert.rejects(buildStaticRelease(root, origin, revision, source.subarray(0, 40)), /WebP invalide/);
  assert.deepEqual(await readdir(root), [first.split(/[/\\]/).at(-1)]);
  const second = await buildStaticRelease(root, origin, {
    ...revision, id: "00000000-0000-4000-8000-000000000002", title: "Deuxième version",
  }, source);
  assert.match(await readFile(join(second, article), "utf8"), /Deuxième version/);
  assert.equal(await readFile(join(first, article), "utf8"), html);
  console.log("Instantanés statiques V1 et V2, HTML échappé, WebP décodable et rejet d’un fichier tronqué vérifiés.");
} finally {
  await rm(root, { recursive: true, force: true });
}
