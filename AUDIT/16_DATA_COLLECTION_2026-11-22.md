# Dokladnosc zbierania danych — 2026-11-22

**Galaz:** `fix/data-collection-accuracy`
**Decyzje:** advisor (Fable) na podstawie researchu i zapytan do bazy produkcyjnej (tylko odczyt, agregaty).
**Poza zakresem (decyzja wlasciciela):** sesja prywatna i odtwarzanie offline.
**Testy:** backend 104/104 (+13), frontend 33/33. SQL migracji i przeliczania sprawdzony na Postgresie (PGlite).

## Co pokazaly dane produkcyjne (2026-11-21)

| Pomiar | Wynik |
|--------|-------|
| `played_at` — poczatek czy koniec? | **Koniec.** W 1632 z 3882 par kolejnych odtworzen odstep = dlugosc *biezacego* utworu (124 = poprzedniego), mediana roznicy 0,7 s. Tak samo jak `ts` w eksporcie RODO ("when the stream ended") |
| Przerwane utwory | 21% par ma odstep krotszy niz dlugosc utworu |
| Zawyzenie minut | ~2,3% (14 796 → 14 457 min) |
| Konta z aktywnym zbieraniem | **1 z 7.** Pozostalym token Spotify zostal skasowany (ostatnia synchronizacja: styczen / kwiecien 2026) |
| Dziura w danych | maj–pazdziernik 2026 (aplikacja nie dzialala, nic nie zaalarmowalo) |
| Dane z importu RODO | 0 wierszy |

## Przyczyny i poprawki

| ID | Problem | Poprawka |
|----|---------|----------|
| COL-01 | **Wylogowanie kasowalo token Spotify** — zbieranie co godzine zatrzymywalo sie na zawsze. To samo przy wykryciu ponownego uzycia JWT | Wylogowanie i wykrycie ponownego uzycia uniewazniaja tylko sesje aplikacji (`tokenVersion++`). Nowe `POST /auth/disconnect` (Profil → "Zatrzymaj zbieranie i odlacz Spotify") kasuje token i ustawia `collectionEnabled=false`. Ponowne logowanie wlacza zbieranie |
| COL-02 | **Nowy refresh token od Spotify nie byl zapisywany** (PKCE — Spotify rotuje tokeny) w statystykach i w cronie → stary token w koncu `invalid_grant` → skasowany | Wspolny `tokenService.getValidAccessToken()`: zapisuje zrotowany token warunkowym `updateMany` (bez nadpisania nowszego tokenu przez rownolegla instancje), uzywa zapisanego access tokenu zamiast odswiezac go co godzine |
| COL-03 (G3) | Token kasowany przy kazdym bledzie z "revoked" w tresci | Tylko przy `body.error === 'invalid_grant'`; ustawia `spotifyGrantRevokedAt`, log `spotify_grant_revoked` |
| COL-04 (G1) | Nieudana synchronizacja liczona jako udana (blad polykany w `collectFromAPI`, `lastSyncAt` ustawiany) | Cron rzuca bledy, liczy je jako `failed`; `lastSyncAt` tylko po sukcesie; `lastSyncAttemptAt`, `lastSyncError`, `syncFailureCount` |
| COL-05 | 429 (limit konta dewelopera) — kolejni uzytkownicy i tak byli odpytywani | 429 przerywa caly przebieg; endpoint zwraca 500 (Cloud Scheduler oznacza przebieg jako nieudany) |
| COL-06 (G2) | Cotygodniowy cleanup kasowal `AggregatedStats` (statystyki z importu) kazdemu bez tokenu — 6 z 7 kont | Usuniete |
| COL-07 | `msPlayed` z API = pelna dlugosc utworu | `msPlayed = min(durationMs, played_at − poprzedni played_at)`; nowa kolumna `durationMs` (pelna dlugosc, mozna przeliczyc ponownie). Liczone po kazdym zapisie od najstarszego nowego odtworzenia (okno zaczyna sie od poprzedniego wiersza w bazie, takze z importu). Migracja przelicza istniejace dane |
| COL-08 | Brak wykrywania utraconych odtworzen | Pelna strona (50) nowsza niz ostatnie zapisane odtworzenie → `lastGapDetectedAt` + log `sync_gap_detected` |
| COL-09 | `/api/cron/status` nie pokazywal problemow | + `usersCollecting`, `usersFailing`, `lastGapDetected` |

## Swiadomie NIE zrobione

| Co | Dlaczego |
|----|----------|
| Kursor `after` w `recently-played` | Nie odzyska nic ponad 50 ostatnich — nie pomaga |
| Odfiltrowanie odtworzen < 30 s z API | 27 wierszy (~0,7%). Pozniej flaga `isCountedPlay` |
| Import RODO: deduplikacja z API (±5 s, wiersz z importu wygrywa) + przebudowa `AggregatedStats` przy kazdym imporcie | Nastepny PR — w produkcji 0 wierszy z importu |
| Hash pliku importu, zmiana klucza unikalnego, znaczek "dane niepelne" w UI | Pozniej |

## Po wdrozeniu (wlasciciel)

1. Migracja `20261122_collection_health_and_ms_played` (przed merge'em, patrz OPERATIONS.md).
2. Poprosic 6 uzytkownikow o jednorazowe zalogowanie — dopiero po wdrozeniu, inaczej kolejne wylogowanie znow zatrzymaloby zbieranie.
3. Alerty Cloud Monitoring (OPERATIONS.md → "Alerts").
