# AUDIT: Applied Fixes Changelog

**Status:** ETAP 2 - ZAKONCZONY
**Data wdrozenia:** 2026-04-06
**Wdrozyl:** AI Audit Team (Claude Code Opus 4.6)
**Commity:** 5 (6d44104, cea8635, 9f46808, 24588b7, 2b5ba78)
**Testy:** 53/53 pass, 0 regressions

---

## Commit 1: `6d44104` — Critical Security Fixes

| ID | Opis | Plik | Notatki |
|----|------|------|---------|
| SEC-002 | SQL injection fix -> parameterized queries | importService.js | `$executeRawUnsafe` -> `$executeRaw` z `Prisma.sql` + `Prisma.join` |
| SEC-005 | CSRF token w frontend axios | api.ts | Response interceptor (capture) + request interceptor (send on POST/PUT/DELETE/PATCH) |
| SEC-006 | Null origin CORS bypass | app.js | Null origin blocked in production, allowed only in dev |
| SEC-008 | JSON body limit 10MB -> 1MB | app.js | Ochrona przed memory exhaustion |
| SEC-009 | Upload limit 200MB -> 50MB | import.routes.js | File + body limit zmniejszone |
| SEC-013 | Env z /health endpoint | app.js | Usunieto `env: env.nodeEnv` |
| SEC-016 | refreshToken leak w protect.js | protect.js, authController.js | Select clause + strip z req.user, refresh() pobiera z DB |
| SEC-019 | encodeURIComponent na OAuth error | authController.js | Zakodowany error param w redirect |
| TEST-001 | Usun brakujacy rbac.js z testow | security.test.js | Blok RBAC usuniety |
| TEST-002 | CSRF test -> Double Submit Cookie | security.test.js, auth.test.js | + route paths fix + rate limit tolerance + RFC 7807 |
| FE-007/008 | .gitignore update | .gitignore | frontend git internals + dist/ |
| AUDIT | 16 dokumentow audytu | AUDIT/*.md | Dodano do repo z fix statusami |

## Commit 2: `cea8635` — Quick Wins + Performance + A11Y + Cleanup

| ID | Opis | Plik | Notatki |
|----|------|------|---------|
| SEC-017 | Redact req.body w Sentry dla importu | sentry.js | GDPR — nie wysylaj historii do Sentry |
| SEC-018 | Require CRON_SECRET we wszystkich env | cronAuth.js | Dev bypass warunkowy (tylko brak klucza) |
| API-002 | Usun 8 duplikatow DB query | statsController.js | `req.user` zamiast re-fetch, -50% queries na User |
| API-009 | Fix UTF-8 encoding polskich znakow | statsController.js | Garbled Windows-1252 -> czyste ASCII |
| PERF-001 | SQL aggregation getListeningByDay | listeningHistoryService.js | `findMany` + JS -> `$queryRaw GROUP BY` (10-100x szybciej) |
| OPS-003 | npm test w CI/CD | deploy.yml | Job test-backend przed deploy-backend |
| OPS-006 | Frontend .dockerignore | frontend/.dockerignore | Nowy plik — git internals, node_modules, dist |
| A11Y-001 | Skip-to-content link | MainLayout.tsx | sr-only link do #main-content |
| A11Y-003 | aria-label na icon buttons | Header.tsx | Profil + mobile menu button |
| A11Y-005 | prefers-reduced-motion | index.css | Globalne wylaczenie animacji |
| A11Y-006 | prefers-contrast | index.css | Jasniejsza muted-foreground |
| P4 | Usuniete bun.lockb, ui_changes.patch, utilities-backup.css | - | -305KB dead files |
| P4 | ENCRYPTION_KEY w .env.example | .env.example | Osobny klucz od JWT |

## Commit 3: `9f46808` — Remaining Quick Fixes

| ID | Opis | Plik | Notatki |
|----|------|------|---------|
| SEC-010 | Rate limiting na /auth/me | auth.routes.js | Dodano apiLimiter |
| SEC-011 | Security headers na nginx static assets | nginx.conf | X-Frame-Options, HSTS, Referrer-Policy |
| SEC-015 | Log userId zamiast displayName w cron | listeningHistoryService.js | Prywatnosc — truncated ID |
| API-003 | Walidacja date params | statsController.js | isNaN check na from/to |
| API-007 | Discovery error -> next(error) | statsController.js | Spojny RFC 7807 format |
| API-008 | Hardcoded Cloud Run URL w CORS | app.js | Usunieto — env.frontendUrl only |
| API-010 | Pusty profileController | profileController.js, profile.routes.js | Usuniety + route unmounted |
| FE-010 | Duplikat use-toast.ts | components/ui/use-toast.ts | Usuniety re-export |
| PERF-005 | Refetch interval 1min -> 5min | useSpotifyData.ts | Mniej requestow do Spotify API |
| OPS-002 | Smoke test po deploy | deploy.yml | curl /health po deploy backend |
| OPS-005 | ENCRYPTION_KEY w --set-secrets | deploy.yml | Dodano do Cloud Run env mapping |
| OPS-009 | NODE_OPTIONS w Dockerfile | backend/Dockerfile | --max-old-space-size=400 |
| A11Y-002 | Focus visible na kartach | TopArtistCard.tsx, TopTrackCard.tsx | tabIndex, role, onKeyDown |
| A11Y-007 | Escape zamyka mobile menu | Header.tsx | onKeyDown handler |

## Commit 4: `24588b7` — Refactor + TypeScript + UX

| ID | Opis | Plik | Notatki |
|----|------|------|---------|
| FE-003 | Usunieto 36 nieuzywanych shadcn/ui komponentow | components/ui/*.tsx | 48 -> 12 komponentow, -3,424 linii |
| FE-005 | TypeScript interfaces dla API hooks | useSpotifyData.ts | 7 interfejsow, `any[]` -> `HistoryPlay[]` |
| UX-002 | Opisowe empty states | Index.tsx, TopItemsLayout.tsx | Kontekst + wskazowki zamiast "Brak danych" |
| OPS-004 | Security scan blokuje merge | security-scan.yml | Usunieto continue-on-error |

## Commit 5: `2b5ba78` — Token Mutex + Onboarding

| ID | Opis | Plik | Notatki |
|----|------|------|---------|
| API-004 | Token refresh mutex | statsController.js | Per-user lock, concurrent requests share single refresh |
| UX-001 | Onboarding banner | Index.tsx | Pokazuje sie gdy brak danych, dismissible z localStorage |

---

## Operacje Infrastrukturalne (poza kodem)

### SEC-001: Rotacja Sekretow — WYKONANA

| Sekret | Stara wersja | Nowa wersja | Metoda |
|--------|-------------|-------------|--------|
| JWT_SECRET | v1,v2 (disabled) | v3 | `openssl rand -hex 32` + `gcloud secrets versions add` |
| ENCRYPTION_KEY | nie istnial | v1 (nowy) | Utworzony + dodany do Cloud Run env |
| CRON_SECRET_KEY | v1,v2 (disabled) | v3 | + Cloud Scheduler zaktualizowany |
| SPOTIFY_CLIENT_SECRET | v1,v2 | v3 | Zresetowany w Spotify Dashboard |
| DATABASE_URL | v1-v3 | v4 | Haslo zresetowane w Supabase |
| DIRECT_URL | v1-v3 | v4 | j.w. |

**Backend redeployowany:** rewizja 00124-lbh, /health OK

### SEC-001b: BFG Repo Cleaner — NIE POTRZEBNY

Przeszukano cala historie git — prawdziwe wartosci sekretow **nigdy nie zostaly commitowane**. Commit 444539a zawieral tylko frontendowy `.env` z `VITE_API_URL=http://127.0.0.1:5000/api` (nie sekret). `.gitignore` chronil backendowy `.env` od poczatku.

---

## Podsumowanie Koncowe

| Kategoria | Wdrozone | Pozostale |
|-----------|----------|-----------|
| Critical Security (P0) | 8 | 0 |
| Security (P1) | 7 | 2 (SEC-003, SEC-004) |
| API/Code Quality | 8 | 0 |
| Performance | 2 | 1 (PERF-002 streaming parser) |
| Tests | 3 | 2 (TEST-003 frontend, TEST-004 integration) |
| Accessibility | 7 | 0 |
| UX | 2 | 4 (UX-004/005/006, profil stats) |
| DevOps/Ops | 7 | 2 (OPS-001 staging, OPS-007 monitoring) |
| Cleanup | 4 (40 plikow usunietych) | 0 |
| Infrastruktura | 6 sekretow zrotowanych | 0 |
| **LACZNIE** | **48 poprawek** | **11 remaining** |

## Co Pozostalo Do Zrobienia

### Architektoniczne (wymagaja osobnego brancha)

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| SEC-003 | JWT-in-URL -> auth code flow (nowy endpoint POST /auth/exchange) | 4h | HIGH |
| SEC-004 | Spotify access token server-side (migracja DB, zmiana JWT) | 4h | HIGH |
| SEC-007 | Przejscie na httpOnly cookie only (wymaga SEC-003 najpierw) | 2h | MEDIUM |

### Testy

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| TEST-003 | Frontend testy (Vitest + React Testing Library) | 4h | HIGH |
| TEST-004 | Integration testy z Docker PostgreSQL | 2d | MEDIUM |

### Infrastruktura

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| OPS-001 | Staging environment (Cloud Run + DB + Spotify App) | 1d | MEDIUM |
| OPS-007 | Monitoring — zainstaluj prom-client + @sentry/node lub usun stuby | 1d | MEDIUM |
| ARCH-F02 | Redis dla cache i rate limiting | 1d | LOW |

### Performance

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| PERF-002 | Streaming JSON parser dla importu (zamiast JSON.parse calego pliku) | 4h | MEDIUM |

### Backlog (nice to have)

| ID | Opis | Effort |
|----|------|--------|
| UX-004 | Precyzyjne time range labels | 30min |
| UX-005 | Breadcrumbs/back nav | 1h |
| UX-006 | Statystyki na profilu | 2h |
| FE-006 | i18n (jesli planowany angielski) | 2d |
| FE-012 | Sync settings z backendem | 4h |
| ARCH-F03 | Warstwa DTO/response mapping | 2d |
| ARCH-F05 | Shared types frontend-backend | 2d |
