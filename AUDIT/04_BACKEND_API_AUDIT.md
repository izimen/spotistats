# AUDIT: Backend / API / Business Logic

## Ocena: 7/10

Solidna implementacja z dobrymi praktykami (walidacja Zod, caching, circuit breaker, graceful shutdown). Glowne problemy to SQL injection w importService i nadmiernie skomplikowane zarzadzanie tokenami.

---

## Findings

### API-001: SQL Injection w importService (duplikat SEC-002)
- **Severity:** CRITICAL
- **Lokalizacja:** `backend/src/services/importService.js:132-145`
- **Opis:** `$executeRawUnsafe` z string interpolation zamiast parameterized queries
- **Rekomendacja:** Uzyj `Prisma.sql` tagged template literals
- **Status:** ✅ FIXED (2026-04-06) — Zamieniono na `$executeRaw` z `Prisma.sql` + `Prisma.join`

### API-002: Podwojne Pobieranie User z DB
- **Severity:** Medium
- **Lokalizacja:** `backend/src/controllers/statsController.js:119-121`
- **Opis:** `protect` middleware juz pobiera usera z DB i ustawia `req.user`. Kontrolery ponownie pobieraja usera: `const user = await prisma.user.findUnique({ where: { id: userId } })`. To powoduje niepotrzebne zapytanie do DB na kazdy request.
- **Wplyw:** Podwojne zapytanie do bazy danych na kazdy request stats
- **Rekomendacja:** Uzyj `req.user` bezposrednio zamiast ponownego pobierania
- **Status:** proposed

### API-003: Brak Walidacji `from`/`to` Date Params
- **Severity:** Medium
- **Lokalizacja:** `backend/src/controllers/statsController.js:484-485`
- **Opis:** `if (from) options.from = new Date(from);` - brak walidacji ze `from` jest poprawna data. `new Date('invalid')` zwraca `Invalid Date` co moze powodowac nieoczekiwane zapytania Prisma.
- **Wplyw:** Potencjalny error 500 lub nieoczekiwane wyniki
- **Rekomendacja:** Waliduj daty z Zod lub recznym sprawdzeniem `isNaN(date.getTime())`
- **Status:** proposed

### API-004: getAccessToken - Wielokrotne Odswiezanie
- **Severity:** Medium
- **Lokalizacja:** `backend/src/controllers/statsController.js:58-108`
- **Opis:** Kazdy kontroler niezaleznie wywoluje `getAccessToken()`. Jesli wiele requestow przychodzi naraz z wygaslym tokenem, kazdy z nich odswiezy token oddzielnie (race condition na refresh token).
- **Wplyw:** Wielokrotne odswiezanie tokenu, potencjalny token reuse detection false positive
- **Rekomendacja:** Implementuj token refresh lock (mutex) lub centralna logike odswiezania
- **Status:** proposed

### API-005: Import - Caly Plik w Pamieci
- **Severity:** Medium
- **Lokalizacja:** `backend/src/services/importService.js:28-29`
- **Opis:** `entries = JSON.parse(data.toString())` - caly plik (do 200MB) parsowany do pamieci naraz.
  Komentarz w kodzie mowi "CRITICAL: Uses JSONStream for memory-efficient parsing" ale faktycznie uzywa `JSON.parse` (synchroniczny, full memory).
- **Wplyw:** OOM na instancji Cloud Run (512MB) przy duzych plikach
- **Rekomendacja:** Uzyj stream parsera (JSONStream lub clarinet) lub podziel plik na chunki
- **Status:** proposed

### API-006: Brak Paginacji dla getListeningByDay
- **Severity:** Low
- **Lokalizacja:** `backend/src/services/listeningHistoryService.js:198-204`
- **Opis:** `findMany` bez limitu - pobiera WSZYSTKIE plays z zakresu dat. Jesli uzytkownik ma 100k+ plays, to laduje wszystkie do pamieci.
- **Wplyw:** Wolne zapytanie + duze zuzycie pamieci
- **Rekomendacja:** Uzyj SQL aggregation (`GROUP BY DAY(playedAt)`) zamiast ladowania wszystkich rekordow
- **Status:** proposed

### API-007: Niespojne Error Handling w Discovery
- **Severity:** Low
- **Lokalizacja:** `backend/src/controllers/statsController.js:710-716`
- **Opis:** `getDiscoveryRoulette` zwraca blad z `error.message` bezposrednio do klienta, zamiast przekazac do `next(error)` i error handlera.
- **Wplyw:** Niespojny format bledow
- **Rekomendacja:** Uzyj `next(error)` jak w innych kontrolerach
- **Status:** proposed

### API-008: Hardcoded Cloud Run URL w CORS
- **Severity:** Low
- **Lokalizacja:** `backend/src/app.js:55`
- **Opis:** `'https://spotistats-frontend-ox6p5to4qa-lm.a.run.app'` - hardcoded URL. Jesli Cloud Run zmieni URL (nowy deployment), CORS przestanie dzialac.
- **Wplyw:** Staly URL moze byc nieaktualny po redeploymencie
- **Rekomendacja:** Przenies do zmiennej srodowiskowej (np. `ALLOWED_ORIGINS`)
- **Status:** proposed

### API-009: Encoding Issues w Odpowiedziach (UTF-8/Windows-1252)
- **Severity:** Medium
- **Lokalizacja:** `backend/src/controllers/statsController.js:465-466`
- **Opis:** Polskie znaki sa zle zakodowane w odpowiedziach:
  ```
  'Zsynchronizowano ${result.collected} nowych utworĂłw'  // should be: utworów
  'Brak nowych utworĂłw do synchronizacji'                // should be: utworów
  ```
  Podobnie w `statsController.js:581-595` (mood labels).
- **Wplyw:** Zepsute polskie znaki w UI
- **Rekomendacja:** Upewnij sie, ze pliki sa zapisane w UTF-8 (bez BOM). Prawdopodobnie problem z edytorem.
- **Status:** proposed

### API-010: profileController Jest Pusty
- **Severity:** Low
- **Lokalizacja:** `backend/src/controllers/profileController.js`
- **Opis:** Plik eksportuje pusty obiekt `module.exports = {};`
- **Wplyw:** Zbedny plik w repo
- **Rekomendacja:** Usun lub dodaj TODO komentarz z planem
- **Status:** proposed

---

## Endpoints Map

| Method | Path | Auth | Rate Limit | CSRF | Status |
|--------|------|------|-----------|------|--------|
| GET | /health | - | general | - | OK |
| GET | /metrics | - | general | - | WARN: no auth |
| GET | /auth/login | - | auth (3/3min) | - | OK |
| GET | /auth/callback | - | auth (3/3min) | - | OK |
| POST | /auth/refresh | JWT | - | CSRF | WARN: no rate limit |
| POST | /auth/logout | optional JWT | - | CSRF | OK |
| GET | /auth/me | JWT | - | - | WARN: no rate limit |
| DELETE | /auth/me | JWT | - | CSRF | OK |
| GET | /api/v1/stats/* | JWT | api (200/15min) | - | OK |
| POST | /api/v1/stats/clear-cache | JWT | api | CSRF | OK |
| POST | /api/v1/stats/listening-history/sync | JWT | api | CSRF | OK |
| POST | /api/v1/import/upload | JWT | import (10/h) | CSRF | OK |
| POST | /api/v1/import/file | JWT | import | CSRF | OK |
| GET | /api/v1/import/* | JWT | api | - | OK |
| DELETE | /api/v1/import/history | JWT | api | CSRF | OK |
| POST | /api/v1/cron/sync-listening-history | Bearer secret | cron (1/min) | SKIP | OK |
| POST | /api/v1/cron/cleanup | Bearer secret | cron (1/min) | SKIP | OK |
| GET | /api/v1/cron/status | JWT | - | - | OK |
| GET | /api/v1/cron/health | - | - | - | OK |
