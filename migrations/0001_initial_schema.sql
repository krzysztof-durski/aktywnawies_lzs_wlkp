CREATE TABLE admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'pbkdf2-sha256-210000',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  disabled      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at    TEXT NOT NULL,
  user_agent    TEXT,
  ip            TEXT
);
CREATE INDEX idx_sessions_admin_user ON sessions(admin_user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE pages (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body_html   TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by  INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE news_posts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT,
  body_html       TEXT NOT NULL,
  cover_image_key TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by      INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_news_status_published ON news_posts(status, published_at);
CREATE INDEX idx_news_slug ON news_posts(slug);

CREATE TABLE documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  file_key      TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT NOT NULL DEFAULT 'application/pdf',
  category      TEXT NOT NULL,
  discipline    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  published     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  uploaded_by   INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_documents_category ON documents(category, sort_order);
CREATE INDEX idx_documents_discipline ON documents(discipline);

CREATE TABLE gallery_albums (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description     TEXT,
  cover_image_id  INTEGER,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE gallery_images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id      INTEGER NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
  file_key      TEXT NOT NULL,
  thumb_key     TEXT,
  width         INTEGER,
  height        INTEGER,
  caption       TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  uploaded_by   INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_gallery_images_album ON gallery_images(album_id, sort_order);
