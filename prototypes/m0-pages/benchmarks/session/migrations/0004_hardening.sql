ALTER TABLE sessions ADD COLUMN authenticated_at INTEGER NOT NULL DEFAULT 0;

CREATE TABLE rate_buckets (
  scope TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
