# AUDIT: Performance / Optimization

## Ocena: 7/10

Dobre fundamenty (lazy loading, code splitting, vendor chunks, 24h DB cache). Glowne bottlenecks: brak image optimization, getListeningByDay laduje wszystkie rekordy, import parsuje caly plik do pamieci.

---

## Findings

### PERF-001: getListeningByDay Laduje Wszystkie Rekordy
- **Severity:** HIGH
- **Lokalizacja:** `backend/src/services/listeningHistoryService.js:198-204`
- **Opis:** `findMany` bez limitu pobiera WSZYSTKIE plays z zakresu dat do pamieci, potem agreguje w JS. Dla uzytkownika z 50k+ plays to duze zuzycie pamieci i wolne zapytanie.
- **Wplyw:** Wolny response time, high memory usage
- **Rekomendacja:** Zamien na SQL aggregation:
  ```sql
  SELECT EXTRACT(DOW FROM "playedAt")::int as day, COUNT(*)::int as count
  FROM "StreamingHistory"
  WHERE "userId" = $1 AND "playedAt" >= $2
  GROUP BY day ORDER BY day
  ```
- **Impact estimate:** 10-100x szybciej dla duzych zbiorow danych
- **Status:** proposed

### PERF-002: Import - Synchroniczny JSON.parse 200MB
- **Severity:** HIGH
- **Lokalizacja:** `backend/src/services/importService.js:28-29`
- **Opis:** `JSON.parse(data.toString())` blokuje event loop dla duzych plikow. 200MB JSON parsowanie moze zajac kilka sekund.
- **Wplyw:** Zablokowany event loop, timeout, OOM
- **Rekomendacja:** Uzyj streaming JSON parser (np. `stream-json`) lub worker thread
- **Impact estimate:** Zapobiegniecie OOM i timeoutom
- **Status:** proposed

### PERF-003: Brak Image Optimization
- **Severity:** Medium
- **Lokalizacja:** Frontend - wszystkie komponenty wyswietlajace obrazy
- **Opis:** Obrazy albumow/artystow z Spotify CDN (i.scdn.co) sa ladowane bez:
  - `loading="lazy"` (native lazy loading)
  - `width`/`height` attributes (CLS)
  - Format optimization (WebP/AVIF)
  - Brak srcset/sizes
- **Wplyw:** Wiekszy LCP, CLS, bandwidth
- **Rekomendacja:** Dodaj `loading="lazy"`, `width`/`height`, `decoding="async"` do obrazow
- **Impact estimate:** Poprawa LCP o 200-500ms
- **Status:** proposed

### PERF-004: AnimatedBackground na Kazdej Stronie
- **Severity:** Medium
- **Lokalizacja:** `frontend/src/components/AnimatedBackground.tsx`, `frontend/src/layouts/MainLayout.tsx`
- **Opis:** Komponent AnimatedBackground jest renderowany na kazdej stronie. Jesli uzywa CSS animations lub canvas, to niepotrzebne zuzycie GPU.
- **Wplyw:** Zuzycie baterii na mobile, jank na slabszych urzadzeniach
- **Rekomendacja:** Sprawdz czy AnimatedBackground jest lekki. Rozważ wylaczenie na mobile lub przy `prefers-reduced-motion`.
- **Impact estimate:** Poprawa battery life i FPS na mobile
- **Status:** proposed

### PERF-005: React Query - Nadmierny Refetch
- **Severity:** Low
- **Lokalizacja:** `frontend/src/hooks/useSpotifyData.ts:112-113`
- **Opis:** `useRecentlyPlayed` ma `refetchInterval: 1000 * 60 * 1` (co minute) i `staleTime: 1000 * 60 * 1`. To powoduje requesty co minute nawet gdy uzytkownik nie jest aktywny.
- **Wplyw:** Zbedne requesty API, zuzycie quota Spotify
- **Rekomendacja:** Zwieksz interval do 5 minut, dodaj `refetchOnWindowFocus: true` zamiast periodic refetch
- **Status:** proposed

### PERF-006: Vendor UI Chunk Zawiera Tylko 3 Pakiety
- **Severity:** Low
- **Lokalizacja:** `frontend/vite.config.ts:33-38`
- **Opis:** `vendor-ui` chunk zawiera tylko `lucide-react`, `@radix-ui/react-tooltip`, `@radix-ui/react-slot`. Inne Radix pakiety ladowane w glownym bundle.
- **Wplyw:** Suboptymalne chunk splitting
- **Rekomendacja:** Dodaj wiecej Radix pakietow do vendor-ui chunk lub usun manual chunks i pozwol Vite na automatyczne splitting
- **Status:** proposed

### PERF-007: Podwojne DB Query w protect + controller
- **Severity:** Medium
- **Lokalizacja:** `backend/src/middleware/protect.js` + `backend/src/controllers/statsController.js`
- **Opis:** `protect` middleware pobiera usera z DB. Potem kontroler ponownie pobiera tego samego usera. To 2 zapytania zamiast 1 na kazdy request.
- **Wplyw:** Dodatkowy round-trip do DB na kazdy authenticated request
- **Rekomendacja:** Uzyj `req.user` z middleware zamiast ponownego pobierania
- **Impact estimate:** -50% zapytan do tabeli User
- **Status:** proposed

### PERF-008: Brak Connection Pooling Config
- **Severity:** Low
- **Lokalizacja:** `backend/prisma/schema.prisma`
- **Opis:** Uzywa PgBouncer (port 6543) ale brak konfiguracji pool size w Prisma
- **Wplyw:** Domyslne ustawienia moga nie byc optymalne
- **Rekomendacja:** Dodaj `connection_limit` w DATABASE_URL i rozwazyc `pgbouncer=true&connection_limit=10`
- **Status:** proposed

---

## Bundle Analysis (szacunkowy)

| Chunk | Zawartosc | Rozmiar (est.) |
|-------|-----------|----------------|
| vendor-react | react, react-dom, react-router-dom | ~140KB gzipped |
| vendor-query | @tanstack/react-query, axios | ~40KB gzipped |
| vendor-charts | recharts | ~50KB gzipped |
| vendor-ui | lucide-react, radix tooltip/slot | ~30KB gzipped |
| main | App logic, components | ~60KB gzipped |
| **Total** | | **~320KB gzipped** |

Rozmiar jest akceptowalny dla SPA tego typu.
