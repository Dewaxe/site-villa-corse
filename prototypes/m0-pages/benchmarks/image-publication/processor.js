import sharp from "sharp";
import { digest } from "./publication.js";
import { isDemoWebP } from "../session/webp.js";

export async function processImage(id, bytes) {
  if (!(await isDemoWebP(new File([bytes], id, { type: "image/webp" })))) return null;
  const output = await sharp(bytes, { failOn: "warning", limitInputPixels: 1600 * 1600 })
    .webp({ quality: 55 }).toBuffer();
  if (!(await isDemoWebP(new File([output], id, { type: "image/webp" })))) return null;
  return { id, sourceSha256: digest(bytes), sha256: digest(output), output };
}
