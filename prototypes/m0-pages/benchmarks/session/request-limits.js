export class BodyLimitError extends Error {}

async function readBoundedParts(request, limit) {
  const length = request.headers.get("Content-Length");
  if (length !== null && Number(length) > limit) throw new BodyLimitError();

  const parts = [];
  const reader = request.body?.getReader();
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BodyLimitError();
      }
      parts.push(value);
    }
  }
  return { parts, size };
}

export async function readBoundedBody(request, limit) {
  const { parts } = await readBoundedParts(request, limit);
  return new Blob(parts);
}

export async function readBoundedBytes(request, limit) {
  const { parts, size } = await readBoundedParts(request, limit);
  if (parts.length === 1) return parts[0];
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

export async function readJson(request, limit = 16_384) {
  const type = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw new SyntaxError("Expected JSON.");
  return JSON.parse(await (await readBoundedBody(request, limit)).text());
}

export const requestErrorStatus = (error) => error instanceof BodyLimitError ? 413 : 400;
