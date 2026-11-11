ALTER TABLE publication_jobs ADD COLUMN failed INTEGER NOT NULL DEFAULT 0 CHECK (failed IN (0, 1));
