export async function onRequest({ next }) {
  const upstream = await next();
  const response = new Response(upstream.body, upstream);
  response.headers.set("X-M0-Invoked", "1");
  return response;
}
