CREATE TABLE article_revisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  body TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE article_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 0,
  revision_id TEXT REFERENCES article_revisions(id)
);

INSERT INTO article_state (id) VALUES (1);

CREATE TRIGGER mark_article_revision_published
AFTER UPDATE OF revision_id ON article_state
BEGIN
  UPDATE article_revisions SET published = 1 WHERE id = NEW.revision_id;
END;
