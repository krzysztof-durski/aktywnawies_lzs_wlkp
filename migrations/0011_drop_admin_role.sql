-- Superadmin/admin role distinction removed per client request — all admin
-- accounts are now equal (any admin can create other admins, manage
-- konkurencje, etc.). SQLite can't DROP COLUMN a column referenced by a CHECK
-- constraint, so rebuild the table instead.

CREATE TABLE admin_users_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'pbkdf2-sha256-210000',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  disabled      INTEGER NOT NULL DEFAULT 0
);

INSERT INTO admin_users_new (id, username, password_hash, password_salt, password_algo, created_at, disabled)
SELECT id, username, password_hash, password_salt, password_algo, created_at, disabled FROM admin_users;

DROP TABLE admin_users;
ALTER TABLE admin_users_new RENAME TO admin_users;
