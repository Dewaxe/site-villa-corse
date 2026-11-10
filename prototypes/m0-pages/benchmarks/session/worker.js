import { adminArticle, publicArticle } from "./articles.js";
import { readJson, requestErrorStatus } from "./request-limits.js";
import { takeAttempt } from "./rate-limit.js";
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

const localOrigin = "http://localhost:8791";
const cookie = "__Host-m0_session";
const cookieAttrs = "Path=/; HttpOnly; Secure; SameSite=Strict";
const sessionLifetime = 15 * 60;
const recentWindow = 2 * 60_000;
const limits = { register: 12, login: 24, keys: 12, articles: 24 };
const authScopes = new Map([
  ["/api/register/options", "register"], ["/api/register/verify", "register"],
  ["/api/login/options", "login"], ["/api/login/verify", "login"],
  ["/api/keys/options", "keys"], ["/api/keys/verify", "keys"], ["/api/keys/revoke", "keys"],
]);
const accounts = new Map([["demo-a", "INVITE_A"], ["demo-b", "INVITE_B"]]);

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

const deny = () => json({ error: "Accès refusé." }, 401);
const needRecentLogin = () => json({ error: "Reconnecte-toi avec une clé pour modifier tes clés." }, 403);
const tooMany = () => json({ error: "Trop de tentatives. Réessaie dans une minute." }, 429, { "Retry-After": "60" });
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

async function activeSession(db, hash) {
  if (!hash) return null;
  return db.prepare("SELECT account, authenticated_at FROM sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(hash, Date.now()).first();
}

async function storeChallenge(db, challenge, account, purpose, sessionHash = null) {
  const now = Date.now();
  await db.batch([
    db.prepare("DELETE FROM challenges WHERE expires_at <= ?").bind(now),
    db.prepare("INSERT INTO challenges VALUES (?, ?, ?, ?, ?)")
      .bind(challenge, account, purpose, now + 120_000, sessionHash),
  ]);
}

function consumeChallenge(db, challenge, account, purpose, sessionHash = null) {
  if (typeof challenge !== "string") return null;
  return db.prepare(`
    DELETE FROM challenges
    WHERE challenge = ? AND account = ? AND purpose = ? AND expires_at > ? AND session_hash IS ?
    RETURNING challenge
  `).bind(challenge, account, purpose, Date.now(), sessionHash).first();
}

async function register(db, path, body, origin, sessionHash = null) {
  const rpID = new URL(origin).hostname;
  const { account } = body;
  if (path.endsWith("/options")) {
    const { results: keys } = await db.prepare("SELECT id FROM credentials WHERE account = ?").bind(account).all();
    if (!sessionHash && keys.length) {
      return json({ error: "Ce compte possède déjà une clé." }, 409);
    }
    const options = await generateRegistrationOptions({
      rpName: "Villa Corse M0",
      rpID,
      userID: new TextEncoder().encode(account),
      userName: account,
      attestationType: "none",
      supportedAlgorithmIDs: [-7],
      excludeCredentials: keys.map(({ id }) => ({ id })),
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
    });
    await storeChallenge(db, options.challenge, account, "register", sessionHash);
    return json(options);
  }

  const challenge = await consumeChallenge(db, body.challenge, account, "register", sessionHash);
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
  // Recheck authorization in the write itself, even if the session expired during verification.
  const allowed = sessionHash
    ? db.prepare(`
        INSERT INTO credentials
        SELECT ?, ?, ?, ? WHERE EXISTS (
          SELECT 1 FROM sessions WHERE token_hash = ? AND account = ? AND expires_at > ? AND authenticated_at >= ?
        ) ON CONFLICT DO NOTHING
      `).bind(credential.id, account, encode(credential.publicKey), credential.counter, sessionHash, account,
        Date.now(), Date.now() - recentWindow)
    : db.prepare(`
        INSERT INTO credentials
        SELECT ?, ?, ?, ? WHERE NOT EXISTS (
          SELECT 1 FROM credentials WHERE account = ?
        ) ON CONFLICT DO NOTHING
      `).bind(credential.id, account, encode(credential.publicKey), credential.counter, account);
  const insert = await allowed.run();
  return insert.meta.changes === 1 ? json({ ok: true }) : deny();
}

async function login(db, path, body, origin, previousToken) {
  const rpID = new URL(origin).hostname;
  const { account } = body;
  if (path === "/api/login/options") {
    const { results: keys } = await db.prepare("SELECT id FROM credentials WHERE account = ?").bind(account).all();
    if (!keys.length) return deny();
    const options = await generateAuthenticationOptions({
      rpID, userVerification: "required", allowCredentials: keys.map(({ id }) => ({ id })),
    });
    await storeChallenge(db, options.challenge, account, "login");
    return json(options);
  }

  const challenge = await consumeChallenge(db, body.challenge, account, "login");
  if (!challenge || typeof body.response?.id !== "string") return deny();
  const saved = await db.prepare("SELECT * FROM credentials WHERE id = ? AND account = ?")
    .bind(body.response.id, account).first();
  if (!saved) return deny();

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
  const authenticatedAt = Date.now();
  const expiresAt = authenticatedAt + sessionLifetime * 1_000;
  const [update, insert] = await db.batch([
    db.prepare("UPDATE credentials SET counter = ? WHERE id = ? AND counter = ?")
      .bind(result.authenticationInfo.newCounter, saved.id, saved.counter),
    db.prepare(`
      INSERT INTO sessions (token_hash, account, expires_at, credential_id, authenticated_at)
      SELECT ?, ?, ?, ?, ? WHERE changes() = 1
    `).bind(hash, account, expiresAt, saved.id, authenticatedAt),
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

async function revokeKey(db, account, id, sessionHash) {
  if (typeof id !== "string") return deny();

  // Keep at least one key, including when two revocations race.
  const deletion = await db.prepare(`
    DELETE FROM credentials
    WHERE id = ? AND account = ?
      AND EXISTS (SELECT 1 FROM credentials WHERE account = ? AND id <> ?)
      AND EXISTS (
        SELECT 1 FROM sessions WHERE token_hash = ? AND account = ? AND expires_at > ? AND authenticated_at >= ?
      )
    RETURNING id
  `).bind(id, account, account, id, sessionHash, account, Date.now(), Date.now() - recentWindow).first();

  return deletion
    ? json({ ok: true })
    : json({ error: "Cette clé ne peut pas être révoquée." }, 409);
}

export async function handleSessionRequest(request, { DB, ...env }, origin) {
  const url = new URL(request.url);
  if (url.origin !== origin) return deny();
  const path = url.pathname;

  const publicResponse = publicArticle(request, DB, env.IMAGES, url);
  if (publicResponse) return publicResponse;

  if (path === "/api/articles" || path.startsWith("/api/articles/")) {
    if (request.method !== "GET" && request.headers.get("Origin") !== origin) return deny();
    const token = sessionToken(request);
    const session = token && await activeSession(DB, await tokenHash(token));
    if (!session) return deny();
    if (request.method === "POST" && !(await takeAttempt(DB, "articles", session.account, limits.articles))) {
      return tooMany();
    }
    return adminArticle(request, DB, env.IMAGES, path);
  }

  if (path === "/api/session" && request.method === "GET") {
    const token = sessionToken(request);
    if (!token) return deny();
    const session = await activeSession(DB, await tokenHash(token));
    return session ? json({ account: session.account, role: "demo-admin" }) : deny();
  }

  if (path === "/api/keys" && request.method === "GET") {
    const token = sessionToken(request);
    const session = token && await activeSession(DB, await tokenHash(token));
    if (!session) return deny();
    const { results } = await DB.prepare("SELECT id FROM credentials WHERE account = ?")
      .bind(session.account).all();
    return json(results.map(({ id }) => id));
  }

  if (request.method !== "POST" || request.headers.get("Origin") !== origin) return deny();

  if (path === "/api/logout") {
    const token = sessionToken(request);
    if (token) await DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await tokenHash(token)).run();
    return json({ ok: true }, 200, { "Set-Cookie": `${cookie}=; ${cookieAttrs}; Max-Age=0` });
  }

  const scope = authScopes.get(path);
  if (!scope) return json({ error: "Route inconnue." }, 404);

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ error: "Requête invalide." }, requestErrorStatus(error));
  }
  if (scope === "keys") {
    const token = sessionToken(request);
    const hash = token && await tokenHash(token);
    const session = await activeSession(DB, hash);
    if (!session) return deny();
    if (session.authenticated_at < Date.now() - recentWindow) return needRecentLogin();
    if (!(await takeAttempt(DB, scope, session.account, limits[scope]))) return tooMany();

    if (path === "/api/keys/revoke") return revokeKey(DB, session.account, body?.id, hash);
    return register(DB, path, { ...body, account: session.account }, origin, hash);
  }

  if (!accounts.has(body?.account)) return deny();
  if (!(await takeAttempt(DB, scope, body.account, limits[scope]))) return tooMany();

  switch (path) {
    case "/api/register/options":
    case "/api/register/verify":
      return canEnroll(env, body.account, body.invite) ? register(DB, path, body, origin) : deny();
    case "/api/login/options":
    case "/api/login/verify":
      return login(DB, path, body, origin, sessionToken(request));
    default:
      return json({ error: "Route inconnue." }, 404);
  }
}

export default {
  fetch(request, env) {
    return handleSessionRequest(request, env, localOrigin);
  },
};
