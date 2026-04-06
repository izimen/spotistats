# AUDIT: Roadmap

**Ostatnia aktualizacja:** 2026-04-06 (po ETAPIE 2)

## ETAP 2 — ZAKONCZONY (48 poprawek)

### P0 — Critical Security

| ID | Opis | Status |
|----|------|--------|
| SEC-001 | Rotacja 6 sekretow (JWT, Encryption, Cron, Spotify, DB x2) | ✅ DONE (GCP Secret Manager) |
| SEC-001b | BFG Repo Cleaner | ✅ NIE POTRZEBNY (sekrety nigdy w git) |
| SEC-002 | SQL injection fix (parameterized queries) | ✅ DONE |
| SEC-005 | CSRF token w frontend axios | ✅ DONE |
| SEC-016 | Select clause w protect.js | ✅ DONE |
| TEST-001 | Fix security.test.js (rbac, CSRF, routes) | ✅ DONE |

### P1 — Quick Wins

| ID | Opis | Status |
|----|------|--------|
| SEC-006 | Null origin CORS bypass | ✅ DONE |
| SEC-008 | JSON body limit 10MB -> 1MB | ✅ DONE |
| SEC-009 | Upload limit 200MB -> 50MB | ✅ DONE |
| SEC-010 | Rate limiting na /auth/me | ✅ DONE |
| SEC-011 | Security headers na nginx static | ✅ DONE |
| SEC-013 | Env z /health endpoint | ✅ DONE |
| SEC-015 | Log userId zamiast displayName | ✅ DONE |
| SEC-017 | Redact req.body w Sentry | ✅ DONE |
| SEC-018 | Require CRON_SECRET we wszystkich env | ✅ DONE |
| SEC-019 | encodeURIComponent na OAuth error | ✅ DONE |
| API-002 | Usun 8 duplikatow DB query | ✅ DONE |
| API-003 | Walidacja date params | ✅ DONE |
| API-004 | Token refresh mutex | ✅ DONE |
| API-007 | Discovery error -> next(error) | ✅ DONE |
| API-008 | Hardcoded Cloud Run URL w CORS | ✅ DONE |
| API-009 | Fix UTF-8 encoding | ✅ DONE |
| API-010 | Usun pusty profileController | ✅ DONE |
| FE-001 | CSRF token w axios (= SEC-005) | ✅ DONE |
| FE-003 | Usun 36 nieuzywanych shadcn/ui | ✅ DONE |
| FE-005 | TypeScript interfaces dla hooks | ✅ DONE |
| FE-007 | dist/ w .gitignore | ✅ DONE |
| FE-008 | Git internals w .gitignore | ✅ DONE |
| FE-010 | Duplikat use-toast.ts | ✅ DONE |
| PERF-001 | SQL aggregation getListeningByDay | ✅ DONE |
| PERF-005 | Refetch interval 1min -> 5min | ✅ DONE |
| OPS-002 | Smoke test po deploy | ✅ DONE |
| OPS-003 | npm test w CI/CD | ✅ DONE |
| OPS-004 | Security scan blokuje merge | ✅ DONE |
| OPS-005 | ENCRYPTION_KEY w --set-secrets | ✅ DONE |
| OPS-006 | Frontend .dockerignore | ✅ DONE |
| OPS-009 | NODE_OPTIONS w Dockerfile | ✅ DONE |
| TEST-002 | CSRF test -> Double Submit Cookie | ✅ DONE |
| A11Y-001 | Skip-to-content link | ✅ DONE |
| A11Y-002 | Focus visible na kartach | ✅ DONE |
| A11Y-003 | aria-label na icon buttons | ✅ DONE |
| A11Y-005 | prefers-reduced-motion | ✅ DONE |
| A11Y-006 | prefers-contrast | ✅ DONE |
| A11Y-007 | Escape zamyka mobile menu | ✅ DONE |
| UX-001 | Onboarding banner | ✅ DONE |
| UX-002 | Opisowe empty states | ✅ DONE |
| P4 | Usunieto bun.lockb, patch, backup css | ✅ DONE |
| P4 | ENCRYPTION_KEY w .env.example | ✅ DONE |

---

## ETAP 3 — DO ZROBIENIA

### Architektoniczne (wymagaja osobnego brancha)

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| SEC-003 | JWT-in-URL -> auth code flow (POST /auth/exchange) | 4h | HIGH |
| SEC-004 | Spotify access token server-side (migracja DB) | 4h | HIGH |
| SEC-007 | Przejscie na httpOnly cookie only (wymaga SEC-003) | 2h | MEDIUM |

### Testy

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| TEST-003 | Frontend testy (Vitest + React Testing Library) | 4h | HIGH |
| TEST-004 | Integration testy z Docker PostgreSQL | 2d | MEDIUM |

### Infrastruktura

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| OPS-001 | Staging environment (Cloud Run + DB + Spotify App) | 1d | MEDIUM |
| OPS-007 | Monitoring — prom-client + @sentry/node lub usun stuby | 1d | MEDIUM |
| ARCH-F02 | Redis dla cache i rate limiting | 1d | LOW |

### Performance

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| PERF-002 | Streaming JSON parser dla importu | 4h | MEDIUM |

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
| PERF-006 | Lepsza Vite chunk strategy | 30min |
| PERF-008 | Connection pooling config | 15min |

---

## Timeline

```
ETAP 2 (2026-04-06): 48 poprawek — ZAKONCZONY
ETAP 3a: SEC-003 + SEC-004 + SEC-007 (auth refactor) — ~10h
ETAP 3b: TEST-003 + TEST-004 (testy) — ~3d
ETAP 3c: OPS-001 + OPS-007 (staging + monitoring) — ~2d
Ongoing: Backlog items
```
