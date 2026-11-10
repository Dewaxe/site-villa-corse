import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import image from "../../../../.wrangler/webp-decoder/fixtures/small.bin";
import { readJson } from "../../../session/request-limits.js";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  const method = url.pathname === "/transfer-input" ? "GET" : url.pathname === "/transfer-result" ? "POST" : null;
  if (!method || request.method !== method || url.origin !== env.PROBE_ORIGIN ||
      !/^\d{13}$/.test(env.PROBE_UNTIL ?? "") || Date.now() >= Number(env.PROBE_UNTIL) ||
      !token || !/^[A-Za-z0-9_-]{43}$/.test(env.PROBE_TOKEN ?? "") ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(env.PROBE_TOKEN))) {
    return new Response(null, { status: 404, headers });
  }
  if (method === "GET") return new Response(image, { headers: { ...headers, "Content-Type": "image/webp" } });
  let body;
  try { body = await readJson(request, 1024); } catch { return new Response(null, { status: 400, headers }); }
  if (body?.sha256 !== env.TRANSFER_DIGEST) return new Response(null, { status: 409, headers });
  await env.DB.prepare("UPDATE m0_transfer SET completed = 1 WHERE id = 1 AND completed = 0").run();
  return new Response(null, { status: 204, headers });
}
