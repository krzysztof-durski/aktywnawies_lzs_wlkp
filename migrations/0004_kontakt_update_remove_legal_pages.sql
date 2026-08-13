UPDATE pages SET
  title = 'Kontakt',
  body_html = '<h2>Krajowe Zrzeszenie Ludowe Zespoły Sportowe</h2>
<p>01-220 Warszawa, ul. S. Krzyżanowskiego 46a</p>
<p>Telefon: <a href="tel:+48226319919">22 631-99-19</a></p>
<p>E-mail: <a href="mailto:lzs@lzs.pl">lzs@lzs.pl</a></p>
<p>Strona internetowa: <a href="https://www.lzs.pl" target="_blank" rel="noopener">www.lzs.pl</a></p>',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'kontakt';

-- Deferred for now per client request — re-add later (content already drafted
-- in migration 0002 history / the project plan) once ready to publish.
DELETE FROM pages WHERE slug IN ('regulamin', 'polityka-prywatnosci');
