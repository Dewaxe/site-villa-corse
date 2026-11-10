export function onRequest() {
  return new Response("Accès indisponible", {
    status: 403,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-M0-Function": "admin",
      "X-Robots-Tag": "noindex",
    },
  });
}
