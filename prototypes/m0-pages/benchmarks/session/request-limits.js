export class BodyLimitError extends Error {}

export async function readBoundedBody(request, limit) {
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
  return new Blob(parts);
}

export async function readJson(request, limit = 16_384) {
  const type = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw new SyntaxError("Expected JSON.");
  return JSON.parse(await (await readBoundedBody(request, limit)).text());
}

export const requestErrorStatus = (error) => error instanceof BodyLimitError ? 413 : 400;
