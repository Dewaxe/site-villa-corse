import { scryptSync } from "node:crypto";

// Inputs exist only for the benchmark and are never supplied by a caller.
const password = new TextEncoder().encode("m0-benchmark-fixture");
const salt = new TextEncoder().encode("m0-fixture-salt!");

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const path = new URL(request.url).pathname;
    if (path === "/baseline") {
      return new Response(null, { status: 204 });
    }

    try {
      if (path === "/pbkdf2") {
        const key = await crypto.subtle.importKey("raw", password, "PBKDF2", false, ["deriveBits"]);
        await crypto.subtle.deriveBits({
          name: "PBKDF2",
          hash: "SHA-256",
          salt,
          iterations: 600_000,
        }, key, 256);
      } else if (path === "/scrypt") {
        scryptSync(password, salt, 32, { N: 32_768, r: 8, p: 3, maxmem: 64 * 1024 ** 2 });
      } else {
        return new Response(null, { status: 404 });
      }
    } catch (error) {
      return new Response(`${error.name}: ${error.message}`, { status: 500 });
    }

    return new Response(null, { status: 204 });
  },
};
