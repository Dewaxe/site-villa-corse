import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import decoder from "../../worker.js";
import small from "../../../../.wrangler/webp-decoder/fixtures/small.bin";
import large from "../../../../.wrangler/webp-decoder/fixtures/large.bin";

const images = new Map([["/decode-small", small], ["/decode-large", large]]);
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const pattern = /^[A-Za-z0-9_-]{43}$/;

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  const bytes = images.get(url.pathname);
  if (!bytes || request.method !== "GET" || url.origin !== env.PROBE_ORIGIN ||
      !/^\d{13}$/.test(env.PROBE_UNTIL ?? "") || Date.now() >= Number(env.PROBE_UNTIL) ||
      !token || !pattern.test(env.PROBE_TOKEN ?? "") ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(env.PROBE_TOKEN))) {
    return new Response(null, { status: 404, headers });
  }
  const input = new Request(new URL("/decode", url), {
    method: "POST", headers: { "Content-Type": "image/webp" }, body: bytes,
  });
  const result = await decoder.fetch(input);
  return new Response(null, { status: result.status, headers });
}
