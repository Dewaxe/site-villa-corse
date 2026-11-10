import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { publicationInput, finishPublication } from "./publication-jobs.js";
import { readBoundedBody } from "./request-limits.js";

const jobPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function dispatchPublication(id, env) {
  if (!jobPattern.test(id) || !env.GITHUB_DISPATCH_TOKEN) throw new Error("Déclencheur non configuré");
  const response = await fetch(
    "https://api.github.com/repos/Dewaxe/site-villa-corse/actions/workflows/m0-transfer.yml/dispatches", {
      method: "POST", redirect: "error",
      headers: {
        Authorization: "Bearer " + env.GITHUB_DISPATCH_TOKEN,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json", "User-Agent": "Villa-Corse-M0",
      },
      body: JSON.stringify({ ref: "m0/routage-pages", inputs: { job: id } }),
    });
  if (response.status !== 204) throw new Error("Déclenchement GitHub refusé");
}

export async function validationCallback(request, env) {
  const path = new URL(request.url).pathname;
  const match = /^\/internal\/publication\/([^/]+)\/(input|result)$/.exec(path);
  const denied = () => new Response(null, { status: 404, headers });
  if (!match || !jobPattern.test(match[1])) return denied();
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(env.VALIDATION_TOKEN ?? "") ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(env.VALIDATION_TOKEN))) return denied();
  const [, id, action] = match;
  if (action === "input" && request.method === "GET") {
    const input = await publicationInput(env.DB, env.IMAGES, id);
    return input ? new Response(input.bytes, { headers: {
      ...headers, "Content-Type": "image/webp", "X-Source-SHA256": input.job.source_sha256,
    } }) : denied();
  }
  if (action === "result" && request.method === "POST") {
    if (request.headers.get("Content-Type") !== "image/webp") return new Response(null, { status: 400, headers });
    try {
      const bytes = await (await readBoundedBody(request, 250_000)).arrayBuffer();
      const status = await finishPublication(env.DB, env.IMAGES, id,
        request.headers.get("X-Source-SHA256"), bytes);
      return Response.json({ status }, { status: ["published", "stale"].includes(status) ? 200 : 409, headers });
    } catch {
      return new Response(null, { status: 503, headers });
    }
  }
  return denied();
}
