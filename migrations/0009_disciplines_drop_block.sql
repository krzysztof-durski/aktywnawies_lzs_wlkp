-- Konkurencje are no longer split into blocks (sportowy/rekreacyjny/integracyjny)
-- per client request — disciplines are now a flat list. SQLite can't DROP COLUMN
-- a column referenced by a CHECK constraint or part of a UNIQUE(...), so rebuild
-- the table instead.

CREATE TABLE disciplines_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  body_html   TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by  INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  cover_image_key TEXT
);

INSERT INTO disciplines_new (id, slug, title, body_html, sort_order, created_at, updated_at, updated_by, cover_image_key)
SELECT id, slug, title, body_html, sort_order, created_at, updated_at, updated_by, cover_image_key FROM disciplines;

DROP TABLE disciplines;
ALTER TABLE disciplines_new RENAME TO disciplines;

CREATE INDEX idx_disciplines_sort ON disciplines(sort_order);

-- Documents previously tagged with a *block* slug (sportowy/rekreacyjny/integracyjny)
-- as their `discipline`, to show as general links at the top of that block's page,
-- no longer have a page to attach to now that blocks are gone. Detach them (leave
-- them as general documents) rather than deleting the uploaded files.
UPDATE documents SET discipline = NULL WHERE discipline IN ('sportowy', 'rekreacyjny', 'integracyjny');
