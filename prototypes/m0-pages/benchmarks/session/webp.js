import { readBoundedBody } from "./request-limits.js";

const maxImageBytes = 250_000;
const maxDimension = 1_600;

// Accept only the single lossy VP8 chunk produced by our opaque canvas.
export async function isDemoWebP(file) {
  if (file?.type !== "image/webp" || file.size < 31 || file.size > maxImageBytes) return false;
  return isDemoWebPBytes(new Uint8Array(await file.arrayBuffer()));
}

export function isDemoWebPBytes(bytes) {
  if (bytes.byteLength < 31 || bytes.byteLength > maxImageBytes) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) !== 0x52494646 || view.getUint32(4, true) !== bytes.byteLength - 8 ||
      view.getUint32(8) !== 0x57454250 || view.getUint32(12) !== 0x56503820) return false;

  const size = view.getUint32(16, true);
  const padding = size % 2;
  if (size <= 10 || 20 + size + padding !== bytes.byteLength ||
      (padding && view.getUint8(bytes.byteLength - 1) !== 0)) return false;

  const tag = view.getUint8(20) | (view.getUint16(21, true) << 8);
  const partition = tag >>> 5;
  if ((tag & 1) !== 0 || ((tag >>> 1) & 7) > 3 || !(tag & 0x10) ||
      partition === 0 || 10 + partition > size || view.getUint8(23) !== 0x9d ||
      view.getUint16(24) !== 0x012a) return false;

  const width = view.getUint16(26, true) & 0x3fff;
  const height = view.getUint16(28, true) & 0x3fff;
  return width > 0 && width <= maxDimension && height > 0 && height <= maxDimension;
}

export async function readDraftForm(request) {
  const limit = 260_000;
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!request.body || !contentType.startsWith("multipart/form-data;")) return null;

  const body = await readBoundedBody(request, limit);
  try {
    return await new Response(body, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    return null;
  }
}
