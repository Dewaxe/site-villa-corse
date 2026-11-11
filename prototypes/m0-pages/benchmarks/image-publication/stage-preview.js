import { cp, mkdir, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const stage = new URL(".wrangler/publication-preview/", root);
const assets = new URL("public/", stage);
await mkdir(new URL("functions/", stage), { recursive: true });
await cp(new URL("benchmarks/session/public/", root), assets, { recursive: true });
await writeFile(new URL("_routes.json", assets), JSON.stringify({
  version: 1,
  include: ["/", "/index.html", "/client.js", "/api/*", "/internal/publication/*", "/articles/*", "/media/*"],
  exclude: [],
}));
await writeFile(new URL("functions/[[path]].js", stage), `
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { handleSessionRequest } from "../../../benchmarks/session/worker.js";

const pattern = /^[A-Za-z0-9_-]{43}$/;
const assets = new Set(["/", "/index.html", "/client.js"]);
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const deny = () => new Response(null, { status: 404, headers });

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.origin !== env.PROBE_ORIGIN || !/^\\d{13}$/.test(env.PROBE_UNTIL ?? "") ||
      Date.now() >= Number(env.PROBE_UNTIL) || env.PUBLICATION_MODE !== "queued") return deny();

  // The runner uses its own token, verified by the publication handler.
  if (!url.pathname.startsWith("/internal/publication/")) {
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!pattern.test(token) || !pattern.test(env.PROBE_TOKEN ?? "") ||
        !timingSafeEqual(Buffer.from(token), Buffer.from(env.PROBE_TOKEN))) return deny();
  }
  const result = assets.has(url.pathname) ? await next() :
    await handleSessionRequest(request, env, env.PROBE_ORIGIN);
  const response = new Response(result.body, result);
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}
`);
console.log("Artefact local prêt dans .wrangler/publication-preview.");
