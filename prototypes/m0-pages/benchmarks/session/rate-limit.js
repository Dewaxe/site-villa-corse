const windowMs = 60_000;

export async function takeAttempt(db, scope, account, limit, now = Date.now()) {
  const row = await db.prepare(`
    INSERT INTO rate_buckets (scope, expires_at, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT (scope) DO UPDATE SET
      attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    WHERE expires_at <= ? OR attempts < ?
    RETURNING attempts
  `).bind(`${scope}:${account}`, now + windowMs, now, now, now, limit).first();
  return row !== null;
}
