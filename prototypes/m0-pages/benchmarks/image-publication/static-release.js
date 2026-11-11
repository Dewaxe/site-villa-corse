import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderArticle } from "../session/articles.js";
import { processImage } from "./processor.js";

export async function buildStaticRelease(parent, origin, revision, source) {
  const publicUrl = new URL(origin);
  if (publicUrl.protocol !== "https:" || publicUrl.origin !== origin) throw new Error("Origine HTTPS attendue.");
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(revision.id)) throw new Error("Révision invalide.");
  for (const [field, limit] of [["title", 120], ["description", 240], ["body", 4_000]]) {
    if (typeof revision[field] !== "string" || !revision[field].trim() || revision[field].length > limit) {
      throw new Error("Champ de révision invalide.");
    }
  }
  const proof = await processImage(revision.id, source);
  if (!proof) throw new Error("WebP invalide.");

  const release = await mkdtemp(join(parent, "static-release-"));
  try {
    const article = join(release, "articles", "article-test");
    const media = join(release, "media", "article");
    await mkdir(article, { recursive: true });
    await mkdir(media, { recursive: true });
    await writeFile(join(article, "index.html"), renderArticle(revision, origin));
    await writeFile(join(media, revision.id + ".webp"), proof.output);
    await writeFile(join(release, "_headers"), "/*\n  X-Robots-Tag: noindex\n  X-Content-Type-Options: nosniff\n");
    await writeFile(join(release, "404.html"), "<!doctype html><html lang=fr><title>Page introuvable</title><h1>Page introuvable</h1>");
    return release;
  } catch (error) {
    // Only the unique directory just created by this build belongs to this operation.
    await rm(release, { recursive: true, force: true });
    throw error;
  }
}
