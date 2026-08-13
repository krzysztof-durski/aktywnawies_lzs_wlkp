ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin'));

CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  username      TEXT NOT NULL,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  details       TEXT,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

CREATE TABLE site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO site_settings (key, value) VALUES
  ('site_offline', '0'),
  ('site_offline_message', 'Strona jest tymczasowo niedostępna. Zapraszamy wkrótce.');
