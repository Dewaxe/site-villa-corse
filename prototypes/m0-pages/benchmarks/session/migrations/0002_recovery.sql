CREATE TABLE credentials_multi (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL
);

INSERT INTO credentials_multi SELECT id, account, public_key, counter FROM credentials;
DROP TABLE credentials;
ALTER TABLE credentials_multi RENAME TO credentials;
CREATE INDEX credentials_by_account ON credentials (account);

CREATE TABLE sessions_by_key (
  token_hash TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  credential_id TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE
);

INSERT INTO sessions_by_key
SELECT sessions.token_hash, sessions.account, sessions.expires_at, credentials.id
FROM sessions JOIN credentials ON credentials.account = sessions.account;

DROP TABLE sessions;
ALTER TABLE sessions_by_key RENAME TO sessions;
CREATE INDEX sessions_by_credential ON sessions (credential_id);

ALTER TABLE challenges ADD COLUMN session_hash TEXT;
