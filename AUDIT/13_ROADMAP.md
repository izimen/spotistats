# AUDIT: Roadmap

**Ostatnia aktualizacja:** 2026-04-07 (po 11 PR-ach)

---

## ETAP 2 — ZAKONCZONY (48 poprawek, 6 sekretow, 2 migracje DB)

Wszystkie P0/P1 items zrealizowane. Pelna lista w [11_APPLIED_FIXES_CHANGELOG.md](11_APPLIED_FIXES_CHANGELOG.md).

## ETAP 3 — ZAKONCZONY (PR #34-#41)

| ID | Opis | PR | Status |
|----|------|-----|--------|
| SEC-003 | Auth code flow (POST /auth/exchange, DB-backed codes) | #34, #37 | ✅ DONE |
| SEC-004 | Access token server-side (migracja DB, JWT lean) | #34 | ✅ DONE |
| PERF-002 | Streaming JSON parser (stream-json) | #38 | ✅ DONE |
| TEST-003 | Frontend testy (Vitest + RTL, 22 testy) | #39 | ✅ DONE |
| - | npm audit fix (0 HIGH vulnerabilities) | #33 | ✅ DONE |
| - | Jest --forceExit (CI hang fix) | #35 | ✅ DONE |
| - | Auth rate limit 3->10 | #36 | ✅ DONE |
| - | Code review fixes (frontend + backend) | #40, #41 | ✅ DONE |

---

## POZOSTALE — BACKLOG

### Infrastruktura (wymaga zasobow/decyzji)

| ID | Opis | Effort | Priorytet | Notatki |
|----|------|--------|-----------|---------|
| OPS-001 | Staging environment | 1d | MEDIUM | Osobne Cloud Run + DB + Spotify App, koszt ~$0 |
| OPS-007 | Monitoring (Prometheus/Sentry) | 1d | MEDIUM | prom-client + @sentry/node sa stubami w kodzie |
| ARCH-F02 | Redis dla cache i rate limiting | 1d | LOW | Rate limiting per-instance, cache w PostgreSQL |
| TEST-004 | Integration testy z Docker PostgreSQL | 2d | MEDIUM | Obecne testy mockuja Prisma |

### UX Polish

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| UX-004 | Precyzyjne time range labels ("4 Tygodnie" nie "Tydzien") | 30min | LOW |
| UX-005 | Breadcrumbs/back nav na subpages | 1h | LOW |
| UX-006 | Statystyki na profilu (total plays, hours) | 2h | LOW |
| SEC-007 | httpOnly cookie only (usunac localStorage JWT) | 2h | LOW — wymaga custom domain |

### Architektura

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| ARCH-F03 | Warstwa DTO/response mapping | 2d | LOW |
| ARCH-F05 | Shared types frontend-backend (OpenAPI lub monorepo) | 2d | LOW |

### Inne

| ID | Opis | Effort |
|----|------|--------|
| FE-006 | i18n (react-i18next) | 2d |
| FE-012 | Sync settings z backendem | 4h |
| PERF-006 | Lepsza Vite chunk strategy | 30min |
| PERF-008 | Connection pooling config w DATABASE_URL | 15min |

---

## Statystyki Projektu

| Metryka | Wartosc |
|---------|---------|
| PRy zmergowane | 11 (#31-#41) |
| Poprawki kodu | ~55 |
| Sekrety zrotowane | 6 |
| Migracje DB | 2 |
| Testy backend | 53 pass |
| Testy frontend | 22 pass |
| Pliki usuniete | 40+ (shadcn/ui, junk) |
| Linie usuniete | ~4,000+ |
| Vulnerabilities HIGH | 0 (npm audit clean) |
| CI/CD | testy + deploy + smoke test + security scan |
