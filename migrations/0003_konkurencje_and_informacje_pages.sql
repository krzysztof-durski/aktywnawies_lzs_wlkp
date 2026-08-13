CREATE TABLE disciplines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  block       TEXT NOT NULL CHECK (block IN ('sportowy', 'rekreacyjny', 'integracyjny')),
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body_html   TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by  INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  UNIQUE (block, slug)
);
CREATE INDEX idx_disciplines_block ON disciplines(block, sort_order);

-- The reference site has no single "Informacje" landing page — it's a dropdown
-- straight to 6 destinations, 3 of them PDFs (handled by `documents`). Drop the
-- placeholder page seeded in 0002 and replace with the 3 real text-page destinations.
DELETE FROM pages WHERE slug = 'informacje';

INSERT INTO pages (slug, title, body_html) VALUES
(
  'organizatorzy',
  'Organizatorzy',
  '<p>[DO UZUPEŁNIENIA: lista organizatorów, patronów honorowych i partnerów XXIX Ogólnopolskich Igrzysk LZS – Spała 2026.]</p>'
),
(
  'obiekty-igrzysk',
  'Obiekty Igrzysk',
  '<p>[DO UZUPEŁNIENIA: opis obiektów Centralnego Ośrodka Sportu w Spale, na których odbędą się zawody.]</p>'
),
(
  'historia-igrzysk',
  'Historia Igrzysk',
  '<p>[DO UZUPEŁNIENIA: historia Ogólnopolskich Igrzysk LZS, sięgająca ruchu LZS z lat 40. XX wieku.]</p>'
);

-- Seed a few example disciplines under "Blok sportowy" matching the reference
-- site's screenshot, as placeholders the client can rename/reorder/extend via
-- the admin panel — the full discipline list per block isn't finalized yet.
INSERT INTO disciplines (block, slug, title, sort_order) VALUES
('sportowy', 'lekkoatletyka', 'Lekkoatletyka', 1),
('sportowy', 'podnoszenie-ciezarow', 'Podnoszenie ciężarów', 2),
('sportowy', 'zapasy', 'Zapasy', 3);
