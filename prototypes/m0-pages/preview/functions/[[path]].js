import { publicArticle } from "../../benchmarks/session/articles.js";

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
  "X-Content-Type-Options": "nosniff",
  "X-M0-Invoked": "1",
};

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const { pathname } = url;
  const read = request.method === "GET" || request.method === "HEAD";
  let response;

  if (read && (pathname === "/api/health" || pathname === "/api/health/")) {
    response = Response.json({ ok: true });
  } else if (/^\/(api|admin)(\/|$)/.test(pathname)) {
    response = new Response("Accès fermé dans cette prévisualisation.", { status: 403 });
  } else if (!read) {
    response = new Response("Méthode interdite.", { status: 405, headers: { Allow: "GET, HEAD" } });
  } else if (pathname === "/articles/article-test/") {
    response = new Response(null, { status: 308, headers: { Location: "/articles/article-test" } });
  } else if (!env.DB || !env.IMAGES) {
    response = new Response("Données indisponibles.", { status: 503 });
  } else {
    try {
      const readRequest = request.method === "HEAD" ? new Request(request, { method: "GET" }) : request;
      response = await publicArticle(readRequest, env.DB, env.IMAGES, url);
      response ??= new Response("Ressource introuvable.", { status: 404 });
    } catch {
      response = new Response("Données indisponibles.", { status: 503 });
    }
  }

  const body = request.method === "HEAD" ? null : response.body;
  const result = new Response(body, response);
  for (const [name, value] of Object.entries(headers)) result.headers.set(name, value);
  return result;
}
