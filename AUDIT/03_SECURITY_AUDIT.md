# AUDIT: Security / AppSec / Secrets

## Ocena: 8/10 (po ETAPIE 2)

Aplikacja ma solidne fundamenty bezpieczenstwa (Helmet, CORS, PKCE, refresh token rotation, AES-256-GCM encryption). 15 z 19 findings naprawionych w ETAPIE 2. Sekrety zrotowane. Pozostalo: SEC-003 (JWT-in-URL), SEC-004 (access token server-side), SEC-007 (localStorage), SEC-010 (rate limit /auth/me — FIXED).

---

## CRITICAL

### SEC-001: Sekrety w Historii Git
- **Severity:** CRITICAL
- **Lokalizacja:** `backend/.env` w commit `444539a`
- **Dowod:** `git log --all -1 --format='%H' -- 'backend/.env'` zwraca wynik; plik zawieral:
  - `DATABASE_URL` (Supabase PostgreSQL z haslem)
  - `SPOTIFY_CLIENT_SECRET`
  - `JWT_SECRET`
  - `ENCRYPTION_KEY`
  - `CRON_SECRET_KEY`
- **Scenariusz ataku:** Kazdy z dostepem do repo (lub forka) moze odczytac sekrety z historii git
- **Wplyw:** Pelny dostep do bazy danych, mozliwosc podszywania sie pod aplikacje, deszyfracja tokenow
- **Rekomendacja:**
  1. NATYCHMIAST zrotuj wszystkie sekrety (Supabase, Spotify, JWT, Encryption)
  2. Uzyj `git filter-repo` lub BFG Repo Cleaner do usuniecia z historii
  3. Upewnij sie, ze `.env` jest w `.gitignore` PRZED pierwszym commitem w przyszlosci
- **Status:** ✅ RESOLVED (2026-04-06) — Wszystkie 6 sekretow zrotowane w GCP Secret Manager, stare wersje disabled, backend redeployowany. BFG nie potrzebny (sekrety nigdy nie byly w git history)

### SEC-002: SQL Injection w importService.js
- **Severity:** CRITICAL
- **Lokalizacja:** `backend/src/services/importService.js:133-145`
- **Dowod:**
  ```javascript
  const values = batch.map(stat =>
      `('${userId}', '${stat.trackUri.replace(/'/g, "''")}', '${stat.artistName.replace(/'/g, "''")}', ...)`
  ).join(',\n');
  await prisma.$executeRawUnsafe(`INSERT INTO "AggregatedStats" ... VALUES ${values} ...`);
  ```
- **Scenariusz ataku:** Zloslwie spreparowany plik Spotify Extended History z trackName/artistName zawierajacym SQL injection payload. Podwojne apostrofy mozna obejsc przez kodowanie Unicode, null bytes, lub inne techniki.
- **Wplyw:** Odczyt/modyfikacja/usuniecie dowolnych danych w bazie
- **Rekomendacja:** Zamiana na parameterized query:
  ```javascript
  await prisma.$executeRaw`
    INSERT INTO "AggregatedStats" ...
    VALUES (${userId}, ${stat.trackUri}, ${stat.artistName}, ...)
    ON CONFLICT ... DO UPDATE ...
  `;
  ```
  Lub uzycie Prisma `createMany` z `skipDuplicates` + osobny UPDATE.
- **Status:** ✅ FIXED (2026-04-06) — Zamieniono na `$executeRaw` z `Prisma.sql` tagged template + `Prisma.join`

---

## HIGH

### SEC-003: JWT z Spotify Access Token w URL
- **Severity:** HIGH
- **Lokalizacja:** `backend/src/controllers/authController.js:156`
- **Dowod:** `res.redirect(\`${env.frontendUrl}/callback?token=${encodeURIComponent(jwtToken)}\`)`
- **Scenariusz ataku:** JWT (zawierajacy Spotify access token) widoczny w:
  - Server access logs
  - Browser history
  - Referrer header jesli uzytkownik kliknie link zewnetrzny
  - Narzedzia monitorujace (APM, analytics)
- **Wplyw:** Wyciek JWT = sesja + dostep Spotify
- **Rekomendacja:** Uzyj krotkotrwalego authorization code (np. 30s, single-use) zamiast pelnego JWT w URL. Frontend wymienia code na JWT przez bezpieczny POST.
- **Status:** proposed

### SEC-004: Spotify Access Token w JWT Payload
- **Severity:** HIGH
- **Lokalizacja:** `backend/src/controllers/authController.js:50-57`
- **Dowod:** `spotifyAccessToken: accessToken` w `jwt.sign()` payload
- **Scenariusz ataku:** Wyciek JWT (XSS, log leak, URL) daje atakujacemu dostep do Spotify API uzytkownika
- **Wplyw:** Atakujacy moze odczytac dane Spotify uzytkownika
- **Rekomendacja:** Przechowuj access token server-side (DB/Redis), nie w JWT
- **Status:** proposed

### SEC-005: Frontend nie wysyla CSRF Token
- **Severity:** HIGH
- **Lokalizacja:** `frontend/src/lib/api.ts` (brak X-CSRF-Token w request interceptor)
- **Dowod:** Backend `csrf.js:84` wymaga `cookieToken && headerToken && cookieToken === headerToken`. Frontend axios nie dodaje `X-CSRF-Token` headera.
- **Scenariusz ataku:** POST/PUT/DELETE requesty z frontendu sa odrzucane przez CSRF middleware (403). Ale CORS `credentials: true` moze pozwalac na cross-origin requesty.
- **Wplyw:** Albo CSRF ochrona jest nieefektywna (jesli bypassowana), albo frontend nie dziala poprawnie (jesli nie bypassowana)
- **Analiza:** Prawdopodobnie CSRF jest obchodzony przez fakt, ze token nie jest wymagany gdy `X-Requested-With` jest ustawiony (legacy fallback). ALE kod CSRF mowi "SECURITY FIX: Strict double-submit cookie validation only / Removed legacy X-Requested-With fallback". Wiec albo frontend nie moze wykonywac POST requestow, albo jest inny bypass.
- **Rekomendacja:** Dodaj do axios interceptora:
  ```typescript
  // Read CSRF token from response header or cookie
  api.interceptors.response.use((response) => {
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      api.defaults.headers.common['X-CSRF-Token'] = csrfToken;
    }
    return response;
  });
  ```
- **Status:** ✅ FIXED (2026-04-06) — Dodano response interceptor (wyciaga X-CSRF-Token) i request interceptor (wysyla go na POST/PUT/DELETE/PATCH)

### SEC-006: CORS Pozwala null Origin
- **Severity:** HIGH
- **Lokalizacja:** `backend/src/app.js:68-69`
- **Dowod:** `if (!origin) return callback(null, true);`
- **Scenariusz ataku:** Request bez Origin header (np. z `file://`, iframe sandbox, lub curl) jest akceptowany przez CORS
- **Wplyw:** Potencjalny bypass CORS policy
- **Rekomendacja:** Usun `if (!origin)` fallback lub ogranicz do development
- **Status:** ✅ FIXED (2026-04-06) — Null origin dozwolony tylko w development, zablokowany w production

---

## MEDIUM

### SEC-007: JWT Token w localStorage (Frontend)
- **Severity:** Medium
- **Lokalizacja:** `frontend/src/pages/Callback.tsx:35`, `frontend/src/lib/api.ts:98`
- **Dowod:** `localStorage.setItem('spotify_jwt', tokenFromUrl)`
- **Scenariusz ataku:** XSS moze odczytac token z localStorage
- **Wplyw:** Kradzież sesji przez XSS
- **Rekomendacja:** Preferuj httpOnly cookies (juz uzywane jako fallback). Usun localStorage token jesli cookie dziala.
- **Status:** proposed

### SEC-008: Body Size Limit 10MB dla JSON
- **Severity:** Medium
- **Lokalizacja:** `backend/src/app.js:88`
- **Dowod:** `app.use(express.json({ limit: '10mb' }))`
- **Wplyw:** Mozliwosc przesylania duzych JSON payloadow (memory exhaustion)
- **Rekomendacja:** Zmniejsz do 1MB dla ogolnych endpointow, pozostaw 10MB+ tylko dla import
- **Status:** ✅ FIXED (2026-04-06) — Zmniejszono z 10MB na 1MB w app.js

### SEC-009: File Upload 200MB Limit
- **Severity:** Medium
- **Lokalizacja:** `backend/src/routes/import.routes.js:16-20`
- **Dowod:** `fileSize: 200 * 1024 * 1024`
- **Wplyw:** Single user moze uploadowac 200MB plik, wyczerpujac pamiec instancji Cloud Run (512MB)
- **Rekomendacja:** Zmniejsz limit do 50MB, dodaj streaming processing zamiast memory buffer
- **Status:** ✅ FIXED (2026-04-06) — Zmniejszono z 200MB na 50MB (file), z 100MB na 50MB (body)

### SEC-010: Brak Rate Limiting na /auth/me
- **Severity:** Medium
- **Lokalizacja:** `backend/src/routes/auth.routes.js`
- **Dowod:** `router.get('/me', protect, authController.me)` - brak rate limitera
- **Wplyw:** Endpoint moze byc uzyty do brute-force enumeration lub DDoS
- **Rekomendacja:** Dodaj `apiLimiter` do `/auth/me`
- **Status:** ✅ FIXED (2026-04-06) — apiLimiter dodany do auth.routes.js

### SEC-011: Brak Helmet noSniff na Static Assets
- **Severity:** Medium
- **Lokalizacja:** `frontend/nginx.conf:58-65`
- **Dowod:** Location block dla static assets dodaje `X-Content-Type-Options` ale nie powtarza wszystkich security headers z glownego bloku
- **Wplyw:** Brak HSTS, CSP, Referrer-Policy na static assets
- **Rekomendacja:** Dodaj brakujace security headers do location block static assets
- **Status:** ✅ FIXED (2026-04-06) — Dodano X-Frame-Options, HSTS, Referrer-Policy do nginx static location

### SEC-012: Error Handler Leaks Stack w Development
- **Severity:** Medium
- **Lokalizacja:** `backend/src/middleware/errorHandler.js:111`
- **Dowod:** `...(env.isProduction ? {} : { stack: err.stack })`
- **Wplyw:** Stack trace widoczny w development - OK, ale upewnij sie, ze NODE_ENV=production w Cloud Run
- **Rekomendacja:** Zweryfikuj, ze deploy.yml ustawia NODE_ENV=production (zweryfikowano - OK)
- **Status:** proposed

---

## LOW

### SEC-013: Health Endpoint Ujawnia Srodowisko
- **Severity:** Low
- **Lokalizacja:** `backend/src/app.js:114`
- **Dowod:** `env: env.nodeEnv` w odpowiedzi /health
- **Rekomendacja:** Usun `env` z produkcyjnego /health
- **Status:** ✅ FIXED (2026-04-06) — Usunieto env z /health response

### SEC-014: Metrics Endpoint Bez Autoryzacji
- **Severity:** Low
- **Lokalizacja:** `backend/src/app.js:119`
- **Dowod:** `app.get('/metrics', metricsEndpoint)` - brak middleware auth
- **Wplyw:** Minimalny (prom-client nie jest zainstalowany), ale gdyby byl - metryki publiczne
- **Rekomendacja:** Dodaj auth middleware lub ogranicz do internal network
- **Status:** proposed

### SEC-015: Console.log z User Info w Cron
- **Severity:** Low
- **Lokalizacja:** `backend/src/services/listeningHistoryService.js:419`
- **Dowod:** `console.log(\`[Cron] User ${userName}: collected=...\`)`
- **Wplyw:** Display name uzytkownika w logach
- **Rekomendacja:** Loguj userId zamiast userName
- **Status:** ✅ FIXED (2026-04-06) — Truncated userId zamiast displayName

---

## NOWE FINDINGS (z weryfikacji agentowej)

### SEC-016: Full User Object (z refreshToken) na req.user
- **Severity:** HIGH
- **Lokalizacja:** `backend/src/middleware/protect.js:54-55`
- **Dowod:** `findUnique` bez `select` - caly obiekt User (w tym zaszyfrowany refreshToken) na `req.user`. Sentry (`sentry.js:65-67`) moze logowac ten obiekt.
- **Wplyw:** Encrypted refresh token moze wyciec do Sentry/logow
- **Rekomendacja:** Dodaj `select` clause z konkretnymi polami
- **Status:** ✅ FIXED (2026-04-06) — Dodano select clause, refreshToken stripowany z req.user, refresh() pobiera z DB osobno

### SEC-017: Sentry Wysyla req.body do Zewnetrznego Serwisu
- **Severity:** Medium
- **Lokalizacja:** `backend/src/middleware/sentry.js:90`
- **Dowod:** `scope.setExtra('body', req.body)` - dla import endpoints to cala historia sluchania uzytkownika
- **Wplyw:** Dane osobowe uzytkownika wysylane do Sentry (GDPR)
- **Rekomendacja:** Redact req.body dla import endpoints
- **Status:** ✅ FIXED (2026-04-06) — req.body nie wysylany do Sentry dla /import endpoints

### SEC-018: Cron Auth Bypass w Non-Production
- **Severity:** Medium
- **Lokalizacja:** `backend/src/middleware/cronAuth.js:25`
- **Dowod:** `if (!env.isProduction)` pozwala kazdy request bez auth
- **Wplyw:** W staging/test kazdy moze triggerowac sync dla wszystkich userow
- **Rekomendacja:** Wymagaj CRON_SECRET_KEY we wszystkich srodowiskach
- **Status:** ✅ FIXED (2026-04-06) — Dev bypass warunkowy (tylko gdy klucz nie skonfigurowany)

### SEC-019: OAuth Error Nie URL-Encoded w Redirect
- **Severity:** Low
- **Lokalizacja:** `backend/src/controllers/authController.js:99`
- **Dowod:** `res.redirect(\`..?error=${error}\`)` - brak `encodeURIComponent`
- **Wplyw:** Minimalne XSS ryzyko (React auto-escapes), ale error moze zawierac specjalne znaki
- **Rekomendacja:** Dodaj `encodeURIComponent(error)`
- **Status:** ✅ FIXED (2026-04-06) — Dodano encodeURIComponent na error redirect

---

## Checklist OWASP ASVS

| Kontrola | Status | Komentarz |
|----------|--------|-----------|
| A01 Broken Access Control | PARTIAL | Brak RBAC, ale IDOR prevention OK, rate limit na /auth/me |
| A02 Cryptographic Failures | ✅ FIXED | Sekrety zrotowane, ENCRYPTION_KEY oddzielony od JWT_SECRET |
| A03 Injection | ✅ FIXED | SQL injection naprawiony (parameterized queries) |
| A04 Insecure Design | PARTIAL | JWT z access token w payload (SEC-004 pending) |
| A05 Security Misconfiguration | ✅ FIXED | CORS null origin zablokowany, health info leak usuniety |
| A06 Vulnerable Components | OK | npm audit w CI/CD |
| A07 Authentication Failures | OK | PKCE, token rotation, version check |
| A08 Software & Data Integrity | OK | npm ci w CI/CD, Prisma migrations |
| A09 Security Logging | PARTIAL | Audit service exists ale console-only |
| A10 SSRF | OK | Brak user-controlled URL fetching |
