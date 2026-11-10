import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { isDemoWebP } from "../session/webp.js";

const folder = new URL("../../.wrangler/webp-decoder/fixtures/", import.meta.url);
await mkdir(folder, { recursive: true });
function vp8(encoded) {
  const raw = Buffer.from(encoded, "base64");
  for (let offset = 12; offset + 8 <= raw.length;) {
    const size = raw.readUInt32LE(offset + 4);
    const end = offset + 8 + size + (size % 2);
    if (raw.toString("ascii", offset, offset + 4) === "VP8 ") {
      const bytes = Buffer.concat([raw.subarray(0, 12), raw.subarray(offset, end)]);
      bytes.writeUInt32LE(bytes.length - 8, 4);
      return bytes;
    }
    offset = end;
  }
  throw new Error("VP8 manquant");
}

const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  for (const [name, size] of [["small", 320], ["large", 1600]]) {
    const encoded = await page.evaluate((size) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      let seed = 154821;
      for (let y = 0; y < size; y += 4) {
        for (let x = 0; x < size; x += 4) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          ctx.fillStyle = "#" + (seed >>> 8).toString(16).padStart(6, "0");
          ctx.fillRect(x, y, 4, 4);
        }
      }
      for (let q = 80; q >= 0; q -= 2) {
        const base64 = canvas.toDataURL("image/webp", q / 100).split(",")[1];
        if (base64.length <= 333_000) return base64;
      }
      throw new Error("Image trop lourde");
    }, size);
    const bytes = vp8(encoded);
    assert.equal(await isDemoWebP(new File([bytes], name, { type: "image/webp" })), true);
    if (name === "large") assert.ok(bytes.length >= 220_000);
    await writeFile(new URL(name + ".bin", folder), bytes);
    console.log(name + " " + size + " × " + size + " " + bytes.length + " octets");
  }
} finally {
  await browser.close();
}
