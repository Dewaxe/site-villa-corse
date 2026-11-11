import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const stage = new URL(".wrangler/physical-preview/", root);
const assets = new URL("public/", stage);
await mkdir(new URL("functions/", stage), { recursive: true });
await mkdir(assets, { recursive: true });

const html = (await readFile(new URL("benchmarks/session/public/index.html", root), "utf8")).replaceAll("\r\n", "\n");
const client = (await readFile(new URL("benchmarks/session/public/client.js", root), "utf8")).replaceAll("\r\n", "\n");
await writeFile(new URL("index.html", assets), html
  .replaceAll("Essai local des clés d’accès", "Test des clés d’accès")
  .replace(/    <label for="invite">.*\n    <input id="invite"[^\n]*\n/, "")
  .replace(/    <section>[\s\S]*?<\/section>/, ""));
await writeFile(new URL("client.js", assets), client.split("const draftForm")[0]
  .replace('const invite = document.querySelector("#invite");\n', "")
  .replace(", invite: invite.value", "")
  .replace('  invite.value = "";\n', ""));
await writeFile(new URL("_routes.json", assets), JSON.stringify({version:1,include:["/*"],exclude:[]}));
await writeFile(new URL("functions/[[path]].js", stage), `
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { handleSessionRequest } from "../../../benchmarks/session/worker.js";
import { readBoundedBody, readJson } from "../../../benchmarks/session/request-limits.js";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
const pattern = /^[A-Za-z0-9_-]{43}$/;
const cookie = "__Host-m0_probe";
const endpoints = new Set([
  "/api/register/options", "/api/register/verify", "/api/login/options", "/api/login/verify",
  "/api/session", "/api/keys", "/api/keys/options", "/api/keys/verify", "/api/keys/revoke", "/api/logout",
]);
const matches = (value, expected) => pattern.test(value ?? "") && pattern.test(expected ?? "") &&
  timingSafeEqual(Buffer.from(value), Buffer.from(expected));
const unavailable = () => new Response(null, { status: 404, headers });

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const until = Number(env.PROBE_UNTIL);
  if (url.origin !== env.PROBE_ORIGIN || !Number.isSafeInteger(until) ||
      Date.now() >= until || !pattern.test(env.PROBE_TOKEN ?? "")) return unavailable();
  const access = request.headers.get("Cookie")?.split(";").map((item) => item.trim())
    .find((item) => item.startsWith(cookie + "="))?.slice(cookie.length + 1);
  if (url.pathname === "/access" && request.method === "POST") {
    if (request.headers.get("Origin") !== url.origin) return unavailable();
    let code;
    try { code = new URLSearchParams(await (await readBoundedBody(request, 512)).text()).get("code"); }
    catch { return unavailable(); }
    if (!matches(code?.trim(), env.PROBE_TOKEN)) return new Response("Code incorrect. Reviens à la page de test.", { status: 403, headers });
    return new Response(null, { status: 303, headers: {
      ...headers, Location: "/", "Set-Cookie": cookie + "=" + env.PROBE_TOKEN +
        "; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=" + Math.floor((until - Date.now()) / 1000),
    } });
  }
  if (!matches(access, env.PROBE_TOKEN)) {
    if (url.pathname !== "/" || request.method !== "GET") return unavailable();
    return new Response('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Test des clés d’accès</title><h1>Test des clés d’accès</h1><form method="post" action="/access"><label>Code de test <input name="code" type="password" autocomplete="off" required></label> <button>Ouvrir le test</button></form></html>',
      { headers: { ...headers, "Referrer-Policy": "same-origin", "Content-Type": "text/html; charset=utf-8" } });
  }
  let result;
  if (["/", "/client.js"].includes(url.pathname) && request.method === "GET") {
    result = await next();
  } else if (endpoints.has(url.pathname)) {
    if (url.pathname.startsWith("/api/register/") && request.method === "POST") {
      if (request.headers.get("Origin") !== url.origin) return unavailable();
      let data;
      try { data = await readJson(request); } catch { return unavailable(); }
      const invite = data?.account === "demo-a" ? env.INVITE_A : data?.account === "demo-b" ? env.INVITE_B : null;
      if (!invite) return unavailable();
      const incoming = new Headers(request.headers);
      incoming.delete("Content-Length");
      request = new Request(request.url, { method: "POST", headers: incoming, body: JSON.stringify({ ...data, invite }) });
    }
    result = await handleSessionRequest(request, env, url.origin);
  } else {
    return unavailable();
  }
  const response = new Response(result.body, result);
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}
`);
