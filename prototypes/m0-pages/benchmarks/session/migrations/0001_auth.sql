CREATE TABLE challenges (
  challenge TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  expires_at INTEGER NOT NULL
);

CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
