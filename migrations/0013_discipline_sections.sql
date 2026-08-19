-- Group konkurencje into named sections matching the regulamin's own structure
-- (VI. Program: Konkurencje sportowo-rekreacyjne, Ludowe Gry Sportowe, Imprezy
-- towarzyszące) so the public Konkurencje page can render them the same way.
ALTER TABLE disciplines ADD COLUMN section TEXT;
CREATE INDEX idx_disciplines_section ON disciplines(section, sort_order);

UPDATE disciplines SET section = 'Konkurencje sportowo-rekreacyjne'
WHERE slug IN (
  'sztafeta-pieszo-rowerowa', 'dojenie-sztucznej-krowy', 'slalom-taczka-z-ziemniakami-lub-kapusta',
  'rzut-podkowa-do-celu', 'karny-na-pola-punktowe', 'kregle', 'slalom-z-opona', 'spacer-farmera',
  'bieg-w-workach', 'jak-wlodek-zostal-strazakiem', 'strzelanie', 'bieg-z-jajkiem-na-lyzce-sztafeta',
  'gra-w-czoromaj', 'bieg-w-potrojnych-spodniach', 'rzut-ringo-dla-kgw',
  'rzuty-gumowcami-na-odleglosc', 'gasienica-albo-swinka'
);

UPDATE disciplines SET section = 'Ludowe Gry Sportowe'
WHERE slug IN ('wybieranie-monet-ze-garnca-zboza', 'slalom-z-pojemnikiem');

INSERT INTO disciplines (slug, title, body_html, sort_order, section) VALUES
(
  'kulinarna-bitwa-regionow',
  'Kulinarna Bitwa Regionów',
  '<p>Konkurs polega na przygotowaniu tradycyjnej potrawy/potraw regionalnej z wykorzystaniem przynajmniej jednego produktu regionalnego (z wyłączeniem deserów), charakterystycznej dla danego regionu. Przez potrawy i produkty regionalne rozumie się te związane z danym obszarem geograficznym, wywodzące się z tradycji i zwyczajów kultywowanych w danym regionie.</p><p>Oceny dokona Komisja Konkursowa, składająca się z przedstawicieli m.in. wydziałów technologii żywności Uniwersytetu Przyrodniczego w Poznaniu i Uniwersytetu Zielonogórskiego. Nagrodami są puchary dla miejsc I–III oraz równorzędne wyróżnienia (certyfikaty) dla pozostałych uczestników.</p>',
  20,
  'Imprezy towarzyszące'
);
