ALTER TABLE disciplines ADD COLUMN cover_image_key TEXT;

-- Generic editable photo tiles shown on Konkurencje pages (e.g. the reference
-- site's "Lekkoatletyka / Podnoszenie ciężarów / Zapasy / Rekreacja / Integracja
-- / Klasyfikacja" grid) — deliberately not tied to the disciplines/blocks
-- hierarchy since that grid mixes disciplines, whole blocks, and other
-- sections; a free-form title+link+image is the simplest fit.
CREATE TABLE konkurencje_tiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  image_key   TEXT,
  link_url    TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_konkurencje_tiles_order ON konkurencje_tiles(sort_order);
