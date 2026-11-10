import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { isDemoWebP } from "../session/webp.js";

function simpleVP8(raw) {
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
  throw new Error("Bloc VP8 introuvable");
}

const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  const post = async (body, type = "image/webp") => (await fetch("http://127.0.0.1:8794/decode", {
    method: "POST", headers: { "Content-Type": type }, body,
  })).status;

  for (const width of [64, 1600]) {
    const encoded = await page.evaluate((width) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = width;
      const ctx = canvas.getContext("2d");
      for (let i = 0; i < width; i += 8) {
        ctx.fillStyle = "hsl(" + (i * 7 % 360) + ", 65%, 45%)";
        ctx.fillRect(i, 0, 8, width);
      }
      return canvas.toDataURL("image/webp", 0.8).split(",")[1];
    }, width);
    const bytes = simpleVP8(Buffer.from(encoded, "base64"));
    assert.equal(await post(bytes), 204);
    assert.equal(await post(bytes, "image/png"), 400);
    const size = 10 + (bytes.readUIntLE(20, 3) >>> 5);
    const truncated = Buffer.concat([bytes.subarray(0, 20 + size), Buffer.alloc(size % 2)]);
    truncated.writeUInt32LE(truncated.length - 8, 4);
    truncated.writeUInt32LE(size, 16);
    assert.equal(await isDemoWebP(new File([truncated], "bad.webp", { type: "image/webp" })), true);
    assert.equal(await post(truncated), 422);
    console.log(width + " × " + width + " : " + bytes.length + " octets acceptés, flux tronqué refusé.");
  }
  assert.equal(await post(Buffer.alloc(250_001)), 413);
} finally {
  await browser.close();
}
