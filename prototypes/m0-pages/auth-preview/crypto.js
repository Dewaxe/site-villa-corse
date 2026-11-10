import { Buffer } from "node:buffer";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { readJson, requestErrorStatus } from "../benchmarks/session/request-limits.js";

// Synthetic timing probe. It accepts a caller-supplied key and never creates a session.
export async function signatureStatus(request, origin) {
  let input;
  try {
    input = await readJson(request);
  } catch (error) {
    return requestErrorStatus(error);
  }
  try {
    const result = await verifyAuthenticationResponse({
      response: input.assertion,
      expectedChallenge: input.challenge,
      expectedOrigin: origin,
      expectedRPID: new URL(origin).hostname,
      requireUserVerification: true,
      credential: {
        id: input.assertion.id,
        publicKey: new Uint8Array(Buffer.from(input.publicKey, "base64url")),
        counter: 0,
      },
    });
    return result.verified ? 204 : 401;
  } catch {
    return 401;
  }
}
