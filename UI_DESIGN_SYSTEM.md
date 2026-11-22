# SpotiStats — system wizualny „gig poster”

Aplikacja wygląda jak afisz koncertowy: jedna zmienna czcionka, ciemne śliwkowe tło, ciepły „papier” jako kolor tekstu i jeden akcent pobrany z Twojej muzyki. Bez kart, cieni, gradientów i poświat. Hierarchię budują szerokość i grubość pisma oraz cienkie linie.

Kod źródłowy prawdy: `frontend/src/index.css` (tokeny i klasy), `frontend/tailwind.config.ts`, `frontend/src/components/Editorial.tsx` (klocki stron).

## Logo

Znak to żółta okładka płyty z trzema rosnącymi słupkami (statystyki), z której wysuwa się winyl (muzyka). Ten sam motyw ożywa na ekranie logowania.

| Plik | Do czego |
|---|---|
| `docs/brand/logo.svg` | wzorzec, stałe kolory, tło `#16111D` |
| `docs/brand/logo-256.png`, `docs/brand/banner.png` | README, GitHub, prezentacje |
| `frontend/public/favicon.svg`, `favicon-32.png` | karta przeglądarki |
| `frontend/public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | ikona na ekranie głównym (bez zaokrągleń, system nakłada maskę) |
| `frontend/public/og-image.png` | podgląd linku (1200×630) |
| `frontend/src/components/Logo.tsx` | znak w aplikacji; okładka i naklejka biorą akcent użytkownika |

Pole ochronne: co najmniej 1/4 wysokości znaku. Nie zmieniaj proporcji, nie dodawaj cieni ani zieleni Spotify.

## Kolory

| Token | Hex | Rola |
|---|---|---|
| `ink` | `#16111D` | tło (w aplikacji przyciemnione o 6% w stronę akcentu) |
| `ink-2` | `#211A2B` | powierzchnie, pola |
| `line` | `#3A3046` | linie, obramowania |
| `paper` | `#F3EEE6` | tekst główny |
| `muted-ink` | `#A197AD` | tekst pomocniczy |
| `warn` | `#FF7A59` | błędy, akcje nieodwracalne |
| `spotify` | `#1ED760` | wyłącznie przyciski „przez Spotify” |
| `primary` | `#F2C94C` domyślnie | akcent |

Akcent liczy `lib/accent.ts`: dominujący kolor ze zdjęcia artysty nr 1, przycięty w OKLCH tak, by miał kontrast co najmniej 4.5:1 z tłem i nie był zielony. Wynik trafia do `localStorage`.

## Typografia

Jedna rodzina: **Archivo** (zmienna szerokość 62–125, grubość 400–900).

| Klasa | Użycie |
|---|---|
| `.type-poster` | hasła i nazwy artystów, 900, szerokość 62, ciasna interlinia |
| `.type-head` | nagłówki sekcji |
| `.type-figure` | duże liczby, cyfry tabelaryczne |
| `.type-rank` | numery pozycji na listach |
| `.wdth-62` … `.wdth-125` | szerokość pisma |

Tekst ciągły: 16 px, interlinia 1.5, maksymalnie ok. 70 znaków w linii. Bez wersalików w etykietach.

## Kształt i układ

- Promień zaokrągleń wszędzie 4 px (`--radius`). Wyjątek: przycisk Spotify jest pigułką.
- Komputer: pasek boczny `--rail-width: 76px`. Telefon: dolne zakładki `--tabbar-height: 64px` plus margines bezpieczny.
- Zakładki: Teraz, Topki, Historia, Podsumowanie, Konto.
- Sekcje oddziela `.rule` (cienka linia), nie karty.
- Zdjęcia artystów w `.duotone` (szarość + kontrast), na stronie głównej nazwa artysty nachodzi na zdjęcie.

## Ruch

- Jeden moment na stronę: wejście list (`.row-in`) i plakat na stronie głównej.
- Logowanie (`components/login/vinyl.css`): płyta wysuwa się z okładki, igła opada, przez 20 s lecą nuty, potem 3 s przerwy; nagłówek zmienia się co 10 s, słowa spadają z góry.
- `prefers-reduced-motion`: wszystkie animacje wyłączone, płyta stoi wysunięta.

## Teksty

Po polsku, w formie neutralnej płciowo („Twoja muzyka”, nie „słuchałeś”). Przyciski mówią, co się stanie („Pobierz”, „Zatrzymaj”, „Usuń konto”). Puste stany mówią, co zrobić, a nie przepraszają.
