import { Buffer } from "node:buffer";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

const origin = "http://localhost:8790";
const rpID = "localhost";
const fixtures = new Map();
const accounts = new Set(["demo-a", "demo-b"]);

function respond(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request) {
    // Synthetic local harness only. The fixture endpoint is not enrollment.
    if (request.method !== "POST") return respond({ ok: false }, 405);
    const path = new URL(request.url).pathname;
    const body = await request.json();
    if (!accounts.has(body.account)) return respond({ ok: false }, 400);

    if (path === "/fixture") {
      fixtures.set(body.account, {
        credential: {
          id: body.id,
          publicKey: new Uint8Array(Buffer.from(body.publicKey, "base64url")),
          counter: 0,
        },
      });
      return respond({ ok: true });
    }

    const fixture = fixtures.get(body.account);
    if (!fixture) return respond({ ok: false }, 401);

    if (path === "/challenge") {
      const value = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
      fixture.challenge = { value, expiresAt: Date.now() + 60_000 };
      return respond({ challenge: value });
    }

    if (path !== "/verify") return respond({ ok: false }, 404);

    // Consume synchronously before awaiting verification to avoid replay in this isolate.
    const challenge = fixture.challenge;
    fixture.challenge = undefined;
    if (!challenge || challenge.expiresAt <= Date.now()) return respond({ ok: false }, 401);

    try {
      const result = await verifyAuthenticationResponse({
        response: body.assertion,
        expectedChallenge: challenge.value,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: fixture.credential,
        requireUserVerification: true,
      });
      if (!result.verified) return respond({ ok: false }, 401);
      return respond({ ok: true, role: "demo-admin" });
    } catch {
      return respond({ ok: false }, 401);
    }
  },
};
