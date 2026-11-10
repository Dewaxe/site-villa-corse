import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { handleSessionRequest } from "../../benchmarks/session/worker.js";

const routes = new Map([
  ["/probe", "GET"],
  ["/api/register/options", "POST"],
  ["/api/register/verify", "POST"],
  ["/api/login/options", "POST"],
  ["/api/login/verify", "POST"],
  ["/api/session", "GET"],
  ["/api/logout", "POST"],
]);

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const token = request.headers.get("Authorization")?.slice(7);
  if (url.origin !== env.PROBE_ORIGIN || routes.get(url.pathname) !== request.method ||
      !/^\d{13}$/.test(env.PROBE_UNTIL ?? "") || Date.now() >= Number(env.PROBE_UNTIL) ||
      !tokenPattern.test(env.PROBE_TOKEN ?? "") || !tokenPattern.test(token ?? "") ||
      !request.headers.get("Authorization").startsWith("Bearer ") ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(env.PROBE_TOKEN))) {
    return new Response(null, { status: 404, headers });
  }

  if (url.pathname === "/probe") {
    return new Response("<!doctype html><title>WebAuthn M0</title>", {
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const response = await handleSessionRequest(request, env, env.PROBE_ORIGIN);
  const restricted = new Response(response.body, response);
  for (const [name, value] of Object.entries(headers)) restricted.headers.set(name, value);
  return restricted;
}
