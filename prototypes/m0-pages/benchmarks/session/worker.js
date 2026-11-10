import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

const origin = "http://localhost:8791";
const rpID = "localhost";
const cookie = "__Host-m0_session";
const cookieAttrs = "Path=/; HttpOnly; Secure; SameSite=Strict";
const sessionLifetime = 15 * 60;
const accounts = new Map([["demo-a", "INVITE_A"], ["demo-b", "INVITE_B"]]);

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

const deny = () => json({ error: "Accès refusé." }, 401);
const encode = (bytes) => Buffer.from(bytes).toString("base64url");
const decode = (value) => new Uint8Array(Buffer.from(value, "base64url"));

async function tokenHash(token) {
  return encode(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
}

function sessionToken(request) {
  for (const entry of (request.headers.get("Cookie") ?? "").split(";")) {
    const [name, value] = entry.trim().split("=", 2);
    if (name === cookie && /^[A-Za-z0-9_-]{43}$/.test(value ?? "")) return value;
  }
}

function canEnroll(env, account, invite) {
  const expected = env[accounts.get(account)];
  if (!/^[A-Za-z0-9_-]{43}$/.test(expected ?? "") || typeof invite !== "string") return false;
  return /^[A-Za-z0-9_-]{43}$/.test(invite) &&
    timingSafeEqual(Buffer.from(invite), Buffer.from(expected));
}

async function storeChallenge(db, challenge, account, purpose) {
  const now = Date.now();
  await db.batch([
    db.prepare("DELETE FROM challenges WHERE expires_at <= ?").bind(now),
    db.prepare("INSERT INTO challenges VALUES (?, ?, ?, ?)").bind(challenge, account, purpose, now + 120_000),
  ]);
}

function consumeChallenge(db, challenge, account, purpose) {
  if (typeof challenge !== "string") return null;
  return db.prepare(`
    DELETE FROM challenges
    WHERE challenge = ? AND account = ? AND purpose = ? AND expires_at > ?
    RETURNING challenge
  `).bind(challenge, account, purpose, Date.now()).first();
}

async function register(db, path, body) {
  const { account } = body;
  if (path === "/api/register/options") {
    if (await db.prepare("SELECT 1 FROM credentials WHERE account = ?").bind(account).first()) {
      return json({ error: "Ce compte possède déjà une clé." }, 409);
    }
    const options = await generateRegistrationOptions({
      rpName: "Villa Corse M0",
      rpID,
      userID: new TextEncoder().encode(account),
      userName: account,
      attestationType: "none",
      supportedAlgorithmIDs: [-7],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
    });
    await storeChallenge(db, options.challenge, account, "register");
    return json(options);
  }

  const challenge = await consumeChallenge(db, body.challenge, account, "register");
  if (!challenge) return deny();

  let result;
  try {
    result = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      supportedAlgorithmIDs: [-7],
    });
  } catch {
    return deny();
  }
  if (!result.verified) return deny();

  const { credential } = result.registrationInfo;
  const insert = await db.prepare("INSERT INTO credentials VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING")
    .bind(credential.id, account, encode(credential.publicKey), credential.counter).run();
  return insert.meta.changes === 1 ? json({ ok: true }) : deny();
}

async function login(db, path, body, previousToken) {
  const { account } = body;
  const saved = await db.prepare("SELECT * FROM credentials WHERE account = ?").bind(account).first();
  if (!saved) return deny();

  if (path === "/api/login/options") {
    const options = await generateAuthenticationOptions({
      rpID, userVerification: "required", allowCredentials: [{ id: saved.id }],
    });
    await storeChallenge(db, options.challenge, account, "login");
    return json(options);
  }

  const challenge = await consumeChallenge(db, body.challenge, account, "login");
  if (!challenge) return deny();

  let result;
  try {
    result = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: { id: saved.id, publicKey: decode(saved.public_key), counter: saved.counter },
    });
  } catch {
    return deny();
  }
  if (!result.verified) return deny();

  const token = encode(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await tokenHash(token);
  const previousHash = previousToken ? await tokenHash(previousToken) : null;
  const expiresAt = Date.now() + sessionLifetime * 1_000;
  const [update, insert] = await db.batch([
    db.prepare("UPDATE credentials SET counter = ? WHERE id = ? AND counter = ?")
      .bind(result.authenticationInfo.newCounter, saved.id, saved.counter),
    db.prepare("INSERT INTO sessions SELECT ?, ?, ? WHERE changes() = 1")
      .bind(hash, account, expiresAt),
    db.prepare(`
      DELETE FROM sessions
      WHERE expires_at <= ?
        OR (token_hash = ? AND EXISTS (SELECT 1 FROM sessions WHERE token_hash = ?))
    `).bind(Date.now(), previousHash, hash),
  ]);
  if (update.meta.changes !== 1 || insert.meta.changes !== 1) return deny();
  return json({ account, role: "demo-admin" }, 200, {
    "Set-Cookie": `${cookie}=${token}; ${cookieAttrs}; Max-Age=${sessionLifetime}`,
  });
}

export default {
  async fetch(request, { DB, ...env }) {
    const url = new URL(request.url);
    if (url.origin !== origin) return deny();
    const path = url.pathname;

    if (path === "/api/session" && request.method === "GET") {
      const token = sessionToken(request);
      if (!token) return deny();
      const session = await DB.prepare("SELECT account FROM sessions WHERE token_hash = ? AND expires_at > ?")
        .bind(await tokenHash(token), Date.now()).first();
      return session ? json({ account: session.account, role: "demo-admin" }) : deny();
    }

    if (request.method !== "POST" || request.headers.get("Origin") !== origin) return deny();

    if (path === "/api/logout") {
      const token = sessionToken(request);
      if (token) await DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await tokenHash(token)).run();
      return json({ ok: true }, 200, { "Set-Cookie": `${cookie}=; ${cookieAttrs}; Max-Age=0` });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Requête invalide." }, 400);
    }
    if (!accounts.has(body?.account)) return deny();

    switch (path) {
      case "/api/register/options":
      case "/api/register/verify":
        return canEnroll(env, body.account, body.invite) ? register(DB, path, body) : deny();
      case "/api/login/options":
      case "/api/login/verify":
        return login(DB, path, body, sessionToken(request));
      default:
        return json({ error: "Route inconnue." }, 404);
    }
  },
};
