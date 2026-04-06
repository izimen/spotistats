# AUDIT: Architecture

## Podsumowanie

Aplikacja opiera sie na klasycznej architekturze SPA + REST API z dobrym podzialem na warstwy. Backend stosuje pattern controller-service-model, frontend uzywa React Query + custom hooks. Auth flow jest zaawansowany (PKCE + refresh token rotation). Caching jest zaimplementowany na poziomie bazy danych (CachedTopItems). Circuit breaker i rate limiting sa na miejscu.

## Ocena: 7/10

**Mocne strony:**
- Czysty podzial controller/service/route
- Dobre separation of concerns (encryption, PKCE, spotify, audit jako osobne serwisy)
- Lazy loading komponentow frontend
- Manual chunk splitting w Vite
- Preview mode z mock data do testowania UI
- Graceful shutdown
- RFC 7807 error format

**Slabosci:**
- Brak warstwy DTO/response mapping (kontrolery zwracaja surowe dane)
- Spotify access token w JWT (powinien byc server-side)
- Brak warstwy cache w Redis (caching tylko w PostgreSQL)
- Brak API versioning na frontend (hardcoded /api/v1/)
- Brak shared types frontend-backend (brak monorepo, brak shared pakietu)

## Findings

### ARCH-F01: Spotify Access Token w JWT Payload
- **Severity:** HIGH
- **Lokalizacja:** `backend/src/controllers/authController.js:50-57`
- **Opis:** JWT zawiera `spotifyAccessToken` i `spotifyTokenExpiry`. Kompromitacja JWT daje atakujacemu dostep do konta Spotify uzytkownika.
- **Wplyw:** Wyciek JWT (np. z logów, URL, browser extensions) = dostep do danych Spotify
- **Rekomendacja:** Przechowuj Spotify access token server-side (w sesji lub zaszyfrowany w DB). JWT powinien zawierac tylko userId i tokenVersion.
- **Status:** ✅ FIXED (PR #34) — Access token zaszyfrowany w DB, JWT lean

### ARCH-F02: Brak Redis dla Cache/Sessions
- **Severity:** Medium
- **Lokalizacja:** `backend/src/services/spotifyService.js` (cache w PostgreSQL), `backend/src/middleware/rateLimiter.js` (Redis opcjonalny)
- **Opis:** Cache top items w PostgreSQL zamiast Redis. Rate limiting fallback do in-memory (nie wspoldzielony miedzy instancjami Cloud Run).
- **Wplyw:** Na wielu instancjach Cloud Run, rate limiting nie jest wspoldzielony. Cache jest wolniejszy niz powinien.
- **Rekomendacja:** Dodaj Redis (Cloud Memorystore) dla rate limiting i cache.
- **Status:** backlog

### ARCH-F03: Brak Warstwy DTO
- **Severity:** Low
- **Lokalizacja:** Wszystkie kontrolery
- **Opis:** Kontrolery bezposrednio mapuja odpowiedzi API Spotify na format JSON. Brak zdefiniowanych interfejsow/DTO dla odpowiedzi.
- **Wplyw:** Ryzyko niechcianego wycieku danych przy zmianie struktury Spotify API.
- **Rekomendacja:** Dodaj warstwe response mapping/DTO (opcjonalnie - TypeScript na backend pomoze).
- **Status:** backlog

### ARCH-F04: Circuit Breaker - Globalny Stan
- **Severity:** Medium
- **Lokalizacja:** `backend/src/services/spotifyService.js:20-24`
- **Opis:** Circuit breaker uzywa globalnych zmiennych (`circuitState`, `failureCount`). Na Cloud Run z wieloma instancjami, kazda instancja ma wlasny stan.
- **Wplyw:** Circuit breaker nie chroni skutecznie gdy ruch jest rozproszony miedzy instancjami.
- **Rekomendacja:** Akceptowalne na obecna skale. Dla wiekszego ruchu - Redis-backed circuit breaker.
- **Status:** backlog

### ARCH-F05: Brak Shared Types
- **Severity:** Low
- **Lokalizacja:** Frontend `useSpotifyData.ts` vs Backend controllers
- **Opis:** Frontend definiuje interfejsy TypeScript niezaleznie od backendu. Brak wspoldzielonych typow miedzy front i back.
- **Wplyw:** Ryzyko desynchronizacji typow przy zmianach API.
- **Rekomendacja:** Rozwazyc monorepo z shared types package lub generowanie typow z OpenAPI spec.
- **Status:** backlog
