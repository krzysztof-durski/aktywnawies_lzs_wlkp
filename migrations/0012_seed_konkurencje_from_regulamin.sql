-- Real competition list for V Ogólnopolskie Igrzyska LZS "Aktywna Wieś" (2026),
-- taken from the regulamin (VI. PROGRAM — Konkurencje sportowo-rekreacyjne +
-- Ludowe Gry Sportowe). Replaces the 3 generic placeholder disciplines seeded
-- in 0003 (Lekkoatletyka/Podnoszenie ciężarów/Zapasy), which belonged to a
-- different reference event and were never renamed by the client.

DELETE FROM disciplines WHERE slug IN ('lekkoatletyka', 'podnoszenie-ciezarow', 'zapasy');

INSERT INTO disciplines (slug, title, body_html, sort_order) VALUES
(
  'sztafeta-pieszo-rowerowa',
  'Sztafeta pieszo-rowerowa',
  '<p>Startuje reprezentacja województwa w 4-osobowym składzie (2 mężczyzn, 2 kobiety). 1 kobieta i 1 mężczyzna pokonują ustaloną trasę jadąc na rowerze, następnie 1 kobieta oraz 1 mężczyzna pokonują trasę biegnąc. Konkurencja na czas.</p>',
  1
),
(
  'dojenie-sztucznej-krowy',
  'Dojenie sztucznej krowy',
  '<p>W konkurencji biorą udział 3 osoby (minimum 1 mężczyzna) z reprezentacji wojewódzkiej. Każda z nich doi sztuczną krowę przez ustalony przez sędziów czas. W konkurencji liczy się suma zważonego „udoju” uzyskanego przez wszystkich 3 zawodników.</p>',
  2
),
(
  'slalom-taczka-z-ziemniakami-lub-kapusta',
  'Slalom taczką z ziemniakami lub kapustą',
  '<p>W konkurencji startują drużyny w składach 5-osobowych (3 mężczyzn i 2 kobiety), przewożąc na taczce worki z ziemniakami lub kapustą slalomem, między ustawionymi pachołkami na odcinku 30 m (2×15 m), po czym następuje zmiana osoby prowadzącej taczkę. Konkurencja rozgrywana jest na czas. Jeśli podczas wykonywania slalomu ziemniaki lub kapusta spadną z taczki, należy zatrzymać taczkę i ponownie umieścić warzywa na taczce — w tej czynności, pod groźbą dyskwalifikacji, nie może pomagać inny uczestnik konkurencji. Każde pominięcie pachołka skutkuje doliczeniem 10 sekund kary, a dotknięcie pachołka 2 sekundy. O kolejności miejsc decyduje łączny czas uzyskany przez drużynę.</p>',
  3
),
(
  'rzut-podkowa-do-celu',
  'Rzut podkową do celu',
  '<p>Startuje reprezentacja województwa w 3-osobowym składzie (minimum 1 kobieta). Na ziemi, w odległości 5 m od linii rzutów, wyznaczona jest tarcza o wymiarach 3×3 m z punktacją od 1 do 10 pkt. Każdy uczestnik wykonuje 5 ocenianych rzutów. O kolejności decyduje suma punktów zdobytych przez drużynę. W przypadku remisu decyduje większa ilość zdobytych „10”, gdy ta jest równa — liczba zdobytych „9” itd.</p>',
  4
),
(
  'karny-na-pola-punktowe',
  'Karny na pola punktowe',
  '<p>W konkurencji startuje 2 uczestników z województwa (1 mężczyzna i 1 kobieta). Zawodnik wykonuje z odległości 7 m dwa strzały próbne i 5 ocenianych na bramkę 3×2 m, na której znajdują się pola punktowe od 1 do 6. O kolejności decyduje suma punktów zdobytych przez drużynę. W przypadku remisu decyduje większa ilość zdobytych „6”, gdy ta jest równa — liczba zdobytych „5” itd.</p>',
  5
),
(
  'kregle',
  'Kręgle',
  '<p>W konkurencji startują 2 kobiety i 2 mężczyzn z województwa. Konkurencja polega na strąceniu jak największej ilości z 10 ustawionych w trójkąt butelek wypełnionych wodą — rzuty piłką z odległości ok. 8 metrów. Każdy zawodnik ma 3 rzuty, a butelki są ustawiane każdemu kolejnemu zawodnikowi od nowa w ilości 10 sztuk. Wygrywa drużyna, która po zsumowaniu wyników wszystkich zawodników strąci największą ilość butelek. W przypadku remisu wygrywa drużyna, która potrzebowała mniejszej ilości rzutów; gdy ilość rzutów i punktów jest taka sama, odbywa się dogrywka z udziałem drużyny po jednym rzucie każdego zawodnika, do wyłonienia zwycięzcy.</p>',
  6
),
(
  'slalom-z-opona',
  'Slalom z oponą',
  '<p>Konkurencja na czas na dystansie ok. 20 m. Udział biorą 2 kobiety i 2 mężczyzn z województwa. Konkurencja polega na toczeniu opony między rozstawionymi pachołkami. Leżącą oponę jako pierwszy podnosi i toczy mężczyzna do pachołka końcowego, tam przekazuje oponę kobiecie, która musi ją toczyć z powrotem, również slalomem. Wygrywa drużyna, która najszybciej przetoczy oponę. Ominięcie pachołka przez zawodnika powoduje dyskwalifikację drużyny. W przypadku przewrócenia się opony dozwolona jest pomoc drużyny.</p>',
  7
),
(
  'spacer-farmera',
  'Spacer farmera',
  '<p>Występują drużyny 3-osobowe (3 mężczyzn) — przenoszenie worków o ciężarze od 30 do 50 kg.</p>',
  8
),
(
  'bieg-w-workach',
  'Bieg w workach',
  '<p>Po 3 osoby z każdego województwa, minimum 1 kobieta. Konkurencja na czas. Po starcie zawodnik wchodzi do worka i rozpoczyna sztafetę długości do 25 m, mija wyznaczone punkty, wychodzi z worka i wraca z nim jak najszybciej na miejsce startu, przekazuje go następnemu uczestnikowi. Konkurencja kończy się, gdy ostatni zawodnik przybiegnie do mety. W przypadku gdy ktoś się przewróci, wstaje i biegnie dalej. Uczestnicy mogą skakać lub biec w worku.</p>',
  9
),
(
  'jak-wlodek-zostal-strazakiem',
  '„Jak Włodek został strażakiem”',
  '<p>Startują 2 osoby z województwa. Na sygnał sędziego obie biegną z linii startu do miejsca, w którym zakładają/ubierają pas strażacki i hełm, po czym biegną dalej, pokonując dwie przeszkody, i docierają do punktu „strzału” z hydronetki. Jedna z nich pompuje urządzenie wytwarzające ciśnienie wody, druga kieruje strumień wody do specjalnej tarczy, aby uruchomić sygnał dźwiękowy. Konkurencja na czas. Hełmy i pasy strażackie zapewnia organizator.</p>',
  10
),
(
  'strzelanie',
  'Strzelanie',
  '<p>Startują 4 osoby z województwa (minimum 2 kobiety) — strzelanie z broni długiej (2 osoby) i z broni krótkiej (2 osoby). Liczy się suma zdobytych punktów przez drużynę.</p>',
  11
),
(
  'bieg-z-jajkiem-na-lyzce-sztafeta',
  'Bieg z jajkiem na łyżce — sztafeta',
  '<p>W konkurencji bierze udział 4 uczestników (minimum 2 kobiety). Pierwszy zawodnik otrzymuje łyżkę z umieszczonym na niej jajkiem. Zadaniem uczestników jest pokonanie wyznaczonego toru przez każdą osobę, bez upuszczenia jajka, a następnie przekazanie go kolejnemu zawodnikowi zgodnie z zasadą biegu sztafetowego. Konkurencja rozgrywana jest na czas, a zawodnik musi trzymać łyżkę wyłącznie jedną ręką, bez podtrzymywania jajka palcami. W przypadku upuszczenia jajka bądź złamania zasad kara doliczona do łącznego czasu to 30 s.</p>',
  12
),
(
  'gra-w-czoromaj',
  'Gra w „Czoromaj”',
  '<p>Średnica boiska (koła) do gry w „Czoromaj” wynosi 4,30 m z dodatkowym 1,5-metrowym pasem bezpieczeństwa (strefą wolną) na obwodzie — całkowita średnica wynosi 7,30 m. Na powierzchni układa się 5 ringów (obręczy) wykonanych z gumy lub plastiku, przymocowanych do podłoża. Gracze, którzy zostali zmuszeni do pełnienia roli prowadzącego „pasterza” 5 razy w ramach jednego meczu, nie przechodzą do kolejnej rundy (jeśli mecz trwa dłużej niż 20 minut, tacy gracze zostaną wyłonieni na podstawie największej liczby trafień do kategorii „pasterza”). Dla 15 graczy z 15 drużyn przygotowuje się 3 boiska: 3 mecze eliminacyjne, 2 mecze półfinałowe, 1 mecz finałowy. Do kolejnej rundy przechodzi po 3 graczy + 1 (na podstawie wyników, w drodze losowania lub jako wild card); do finału z półfinałów przechodzi po 2 graczy + 1.</p>',
  13
),
(
  'bieg-w-potrojnych-spodniach',
  'Bieg w „potrójnych spodniach”',
  '<p>Startują 3 osoby (2 mężczyzn i 1 kobieta). Drużyna ma za zadanie pokonanie odcinka 2×25 m (tam i z powrotem) w możliwie najkrótszym czasie. Podczas biegu wszyscy zawodnicy muszą mieć kontakt z podłożem. Zwycięża drużyna, która uzyska najlepszy czas.</p>',
  14
),
(
  'rzut-ringo-dla-kgw',
  'Rzut ringo dla KGW',
  '<p>Rzut na paliki o krzyżak z palikami o wysokości 15 cm z odległości 3 m. Za rzuty można otrzymać od 5 do 50 pkt. Decyduje suma punktów.</p>',
  15
),
(
  'rzuty-gumowcami-na-odleglosc',
  'Rzuty gumowcami na odległość',
  '<p>Startują zespoły 2-osobowe (kobieta i mężczyzna), oddają po 2 rzuty — dłuższy będzie oceniany. Suma dłuższych rzutów obojga zawodników zadecyduje o zajętym miejscu.</p>',
  16
),
(
  'gasienica-albo-swinka',
  'Gąsienica albo świnka',
  '<p>Konkurencja do ustalenia — szczegóły zostaną podane w kolejnym komunikacie organizacyjnym.</p>',
  17
),
(
  'wybieranie-monet-ze-garnca-zboza',
  'Wybieranie monet ze garnca zboża',
  '<p>W garncu ze zbożem umieszczone są monety o różnych nominałach. W określonym czasie zawodnik próbuje znaleźć ich jak najwięcej. Wygrywa ten, który „wyłowi” monety o największej łącznej wartości nominałów.</p>',
  18
),
(
  'slalom-z-pojemnikiem',
  'Slalom z pojemnikiem',
  '<p>Konkurencja rekreacyjna polegająca na wykonaniu slalomu z pojemnikiem do selektywnej zbiórki odpadów. Start poprzedza odpowiedź na pytanie z zakresu zasad selektywnej zbiórki odpadów.</p>',
  19
);
