-- Regulamin Igrzysk (main PDF) and Program Igrzysk (schedule) become admin-editable
-- via site_settings instead of hardcoded assets/markup. An empty regulamin_glowny_key
-- means "no upload yet — page falls back to the bundled placeholder PDF"; an empty
-- program_igrzysk_json means "fall back to the hardcoded default schedule".
INSERT INTO site_settings (key, value) VALUES
  ('regulamin_glowny_key', ''),
  ('regulamin_glowny_title', 'Regulamin V Ogólnopolskich Igrzysk LZS „Aktywna Wieś”'),
  ('regulamin_glowny_size', ''),
  ('program_igrzysk_json', '');
