export function onRequestGet() {
  return Response.json({ ok: true }, {
    headers: {
      "Cache-Control": "no-store",
      "X-M0-Function": "health",
      "X-Robots-Tag": "noindex",
    },
  });
}
