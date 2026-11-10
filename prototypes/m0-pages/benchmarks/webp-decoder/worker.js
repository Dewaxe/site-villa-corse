import binary from "../../.wrangler/webp-decoder/wasm32-unknown-unknown/release/m0_webp_decoder.wasm";
import { isDemoWebP } from "../session/webp.js";
import { readBoundedBody } from "../session/request-limits.js";

const { memory, prepare_input, decode_input } = new WebAssembly.Instance(binary).exports;

export default {
  async fetch(request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/decode") {
      return new Response(null, { status: 404 });
    }
    let body;
    try {
      body = await readBoundedBody(request, 250_000);
    } catch {
      return new Response(null, { status: 413 });
    }
    const file = new File([body], "probe.webp", { type: request.headers.get("Content-Type") ?? "" });
    if (!(await isDemoWebP(file))) return new Response(null, { status: 400 });

    const bytes = new Uint8Array(await body.arrayBuffer());
    // The buffer belongs to this instance. Copy and decode without yielding.
    const offset = prepare_input(bytes.length);
    new Uint8Array(memory.buffer, offset, bytes.length).set(bytes);
    return new Response(null, { status: decode_input() ? 204 : 422 });
  },
};
