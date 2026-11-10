import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { adminArticle, publicArticle } from "./articles.js";

const origin = "http://localhost:8791";
const article = origin + "/articles/article-test";
const stateUrl = origin + "/api/articles";
const imageUrl = (id) => origin + "/media/article/" + id + ".webp";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function checkArticle(page, context, waitForStatus) {
  assert.equal((await fetch(article)).status, 404);
  assert.equal((await fetch(stateUrl)).status, 401);
  assert.equal((await fetch(stateUrl + "/draft", {
    method: "POST", headers: { Origin: origin },
  })).status, 401);

  const file = async (color) => {
    const data = await page.evaluate((color) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 32;
      const painter = canvas.getContext("2d");
      painter.fillStyle = color;
      painter.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png").split(",")[1];
    }, color);
    return { name: "source.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") };
  };

  const state = async () => (await context.request.get(stateUrl)).json();
  const draft = async (title, color) => {
    await page.locator('[name="title"]').fill(title);
    await page.locator('[name="description"]').fill('Description "test"');
    await page.locator('[name="body"]').fill("Texte pour " + title + " <script>alert(1)</script>");
    await page.locator('[name="image"]').setInputFiles(await file(color));
    await page.click("#save-draft");
    await waitForStatus("Brouillon enregistré.");
    return (await state()).revisions[0].id;
  };

  const publish = (id, version) => context.request.post(stateUrl + "/publish", {
    headers: { Origin: origin }, data: { id, version },
  });
  const readPublic = async (id, title) => {
    const response = await fetch(article);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
    assert.ok(html.includes("<title>" + title + "</title>"));
    assert.ok(html.includes('content="Description &quot;test&quot;"'));
    assert.ok(html.includes('rel="canonical" href="' + article + '"'));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(!html.includes("<script"));
    assert.ok(html.includes('/media/article/' + id + '.webp'));
    const media = await fetch(imageUrl(id));
    assert.equal(media.headers.get("Content-Type"), "image/webp");
    const dimensions = await page.evaluate(async (url) => {
      const image = await createImageBitmap(await (await fetch(url)).blob());
      const dimensions = [image.width, image.height];
      image.close();
      return dimensions;
    }, imageUrl(id));
    assert.deepEqual(dimensions, [64, 32]);
    return { html, bytes: Buffer.from(await media.arrayBuffer()) };
  };

  const v1 = await draft("Version un", "#2244cc");
  assert.equal((await fetch(article)).status, 404);
  assert.equal((await fetch(imageUrl(v1))).status, 404);
  await page.click("#publish");
  await waitForStatus("Révision publiée.");
  const first = await readPublic(v1, "Version un");
  assert.ok(first.bytes.length > 0 && first.bytes.length <= 250_000);

  const sendInvalid = async (buffer, mimeType = "image/webp", status = 400) => {
    const rejected = await context.request.post(stateUrl + "/draft", {
      headers: { Origin: origin },
      multipart: {
        title: "Invalide", description: "Test", body: "Test",
        image: { name: "bad.webp", mimeType, buffer },
      },
    });
    assert.equal(rejected.status(), status);
  };
  await sendInvalid(Buffer.alloc(260_001), "image/webp", 413);
  await sendInvalid(Buffer.from("not a WebP"));
  await sendInvalid(first.bytes, "image/png");
  const tooWide = Buffer.from(first.bytes);
  tooWide.writeUInt16LE(1601, 26);
  await sendInvalid(tooWide);
  const metadata = Buffer.concat([first.bytes, Buffer.from("EXIF\0\0\0\0")]);
  metadata.writeUInt32LE(metadata.length - 8, 4);
  await sendInvalid(metadata);
  assert.equal((await state()).revisions.length, 1);
  assert.equal((await state()).revision_id, v1);

  const oversizedPublish = await context.request.post(stateUrl + "/publish", {
    headers: { Origin: origin }, data: { id: v1, version: 1, filler: "x".repeat(1024) },
  });
  assert.equal(oversizedPublish.status(), 413);
  const v2 = await draft("Version deux", "#cc4422");
  assert.equal((await fetch(imageUrl(v2))).status, 404);
  assert.equal((await readPublic(v1, "Version un")).html, first.html);
  const version = (await state()).version;
  const responses = await Promise.all([publish(v2, version), publish(v2, version)]);
  assert.deepEqual(responses.map((response) => response.status()).sort(), [200, 409]);
  const second = await readPublic(v2, "Version deux");
  assert.notEqual(sha256(first.bytes), sha256(second.bytes));
  assert.equal(sha256(Buffer.from(await (await fetch(imageUrl(v1))).arrayBuffer())), sha256(first.bytes));

  await page.click("#load-revisions");
  await waitForStatus("Révisions chargées.");
  await page.selectOption("#revisions", v1);
  await page.click("#publish");
  await waitForStatus("Révision publiée.");
  const restored = await readPublic(v1, "Version un");
  assert.equal(restored.html, first.html);
  assert.equal(sha256(restored.bytes), sha256(first.bytes));

  // Inject KV faults around the actual handlers without altering the browser's D1/KV data.
  const putFailure = { put: async () => { throw new Error("KV write failure"); } };
  const form = new FormData();
  for (const [name, value] of Object.entries({ title: "Test", description: "Test", body: "Test" })) {
    form.set(name, value);
  }
  form.set("image", new Blob([first.bytes], { type: "image/webp" }), "image.webp");
  const uploadRequest = new Request(stateUrl + "/draft", { method: "POST", body: form });
  const untouchedDb = { prepare: () => { throw new Error("D1 must not be written"); } };
  assert.equal((await adminArticle(uploadRequest, untouchedDb, putFailure, "/api/articles/draft")).status, 503);

  const revisionDb = { prepare: () => ({ bind: () => ({ first: async () => ({ id: v1 }) }) }) };
  const delayedKv = { get: async () => null };
  const pending = new Request(stateUrl + "/publish", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: v1, version: 3 }),
  });
  assert.equal((await adminArticle(pending, revisionDb, delayedKv, "/api/articles/publish")).status, 503);
  const imageRequest = new Request(imageUrl(v1));
  const fallback = await publicArticle(imageRequest, revisionDb, delayedKv, new URL(imageRequest.url));
  assert.equal(fallback.headers.get("Content-Type"), "image/svg+xml");
  assert.equal(fallback.headers.get("Cache-Control"), "no-store");
  console.log("Article : brouillon privé, WebP, HTML, concurrence, restauration et pannes KV simulées vérifiés.");
}
