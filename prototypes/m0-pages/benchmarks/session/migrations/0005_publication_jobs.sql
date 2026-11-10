CREATE TABLE publication_jobs (
  id TEXT PRIMARY KEY,
  source_revision TEXT NOT NULL REFERENCES article_revisions(id),
  expected_version INTEGER NOT NULL,
  source_sha256 TEXT NOT NULL,
  result_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','published','stale')),
  UNIQUE (source_revision, expected_version)
);
