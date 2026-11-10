import { BodyLimitError, readBoundedBody } from "../session/request-limits.js";
import { isDemoWebP } from "../session/webp.js";

const limit = 250_000;
const reject = (status) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export default {
  async fetch(request, { IMAGES }) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/transform") return reject(404);

    let input;
    try {
      input = await readBoundedBody(request, limit);
    } catch (error) {
      return reject(error instanceof BodyLimitError ? 413 : 400);
    }
    const file = new File([input], "input.webp", { type: request.headers.get("Content-Type") ?? "" });
    if (!(await isDemoWebP(file))) return reject(400);

    try {
      const output = (await IMAGES.input(input.stream()).output({ format: "image/webp", quality: 55 })).response();
      if (!output.ok) return reject(503);
      const bytes = await readBoundedBody(output, limit);
      const result = new File([bytes], "result.webp", { type: output.headers.get("Content-Type") ?? "" });
      if (!(await isDemoWebP(result))) return reject(422);
      return new Response(bytes, {
        headers: { "Content-Type": "image/webp", "Cache-Control": "no-store" },
      });
    } catch (error) {
      return reject(error instanceof BodyLimitError ? 422 : 503);
    }
  },
};
