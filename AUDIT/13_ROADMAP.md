# AUDIT: Roadmap

## Immediate Critical (TERAZ - przed nastepnym deploy)

| Priorytet | ID | Opis | Effort | Impact | Status |
|-----------|-----|------|--------|--------|--------|
| P0 | SEC-001 | Rotacja wszystkich sekretow | 2h | Eliminuje ryzyko kompromitacji | ⏳ wymaga recznej decyzji |
| P0 | SEC-002 | Naprawa SQL injection w importService | 30min | Eliminuje krytyczna luke | ✅ DONE |
| P0 | SEC-005 | CSRF token w frontend axios | 30min | Naprawia CSRF ochrone | ✅ DONE |
| P0 | TEST-001 | Fix security.test.js (rbac reference) | 15min | Testy znow dzialaja | ✅ DONE |
| P0 | SEC-016 | Dodaj select clause w protect.js (nie leakuj refreshToken) | 10min | Eliminuje wyciek tokenu | ✅ DONE |

## Quick Wins (1-2 dni)

| Priorytet | ID | Opis | Effort | Impact | Status |
|-----------|-----|------|--------|--------|--------|
| P1 | SEC-006 | Usun null origin CORS bypass | 5min | Lepsze CORS | ✅ DONE |
| P1 | SEC-017 | Redact req.body w Sentry (import endpoints) | 10min | GDPR compliance | pending |
| P1 | SEC-018 | Wymagaj CRON_SECRET we wszystkich env | 5min | Bezpieczniejszy staging | pending |
| P1 | SEC-019 | encodeURIComponent na OAuth error redirect | 2min | Bezpieczny redirect | ✅ DONE |
| P1 | FE-008 | Usun git internals z frontend/ | 10min | Czyste repo | ✅ DONE |
| P1 | FE-007 | Usun frontend/dist/ z repo | 5min | Czyste repo | ✅ DONE |
| P1 | API-002 | Usun podwojne DB query (req.user) | 15min | -50% DB queries na User | pending |
| P1 | API-009 | Fix UTF-8 encoding polskich znakow | 10min | Poprawne wyswietlanie | pending |
| P1 | PERF-001 | SQL aggregation zamiast findMany | 30min | 10-100x szybciej | pending |
| P1 | OPS-003 | Dodaj npm test do deploy.yml | 10min | Quality gate | pending |
| P1 | OPS-006 | Update frontend .dockerignore | 5min | Mniejszy Docker context | pending |
| P1 | TEST-002 | Update CSRF test | 15min | Poprawne security testy | ✅ DONE |
| P1 | A11Y-003 | aria-label na icon buttons | 10min | Lepsze a11y | pending |
| P1 | SEC-013 | Usun env z /health | 2min | Mniejsze info disclosure | ✅ DONE |
| P1 | SEC-008 | Zmniejsz JSON body limit do 1MB | 5min | DDoS protection | ✅ DONE |
| P1 | SEC-009 | Zmniejsz upload limit do 50MB | 5min | Memory protection | ✅ DONE |

## Next Sprint (1-2 tygodnie)

| Priorytet | ID | Opis | Effort | Impact |
|-----------|-----|------|--------|--------|
| P2 | SEC-003 | Zmiana JWT-in-URL na auth code | 4h | Eliminuje wyciek JWT z URL |
| P2 | SEC-004 | Access token server-side | 4h | Eliminuje wyciek Spotify token |
| P2 | SEC-007 | Przejscie na httpOnly cookie only | 2h | Lepsza ochrona XSS |
| P2 | PERF-002 | Streaming JSON parser dla importu | 4h | Obsluga duzych plikow |
| P2 | OPS-002 | Smoke tests po deploy | 1h | Wykrywanie uszkodzonych deploy |
| P2 | TEST-003 | Podstawowe testy frontend (hooks) | 4h | Regression protection |
| P2 | A11Y-001 | Skip-to-content link | 15min | a11y compliance |
| P2 | A11Y-005 | prefers-reduced-motion | 15min | a11y compliance |
| P2 | A11Y-006 | Poprawa kontrastu muted-foreground | 10min | Czytelnosc |
| P2 | UX-001 | Onboarding po pierwszym logowaniu | 2h | Lepsze doswiadczenie nowego uzytkownika |
| P2 | UX-002 | Opisowe empty states | 1h | Lepsze UX |

## Strategic Refactors (1-2 miesiace)

| Priorytet | ID | Opis | Effort | Impact |
|-----------|-----|------|--------|--------|
| P3 | ARCH-F02 | Redis dla cache i rate limiting | 1d | Wspoldzielony state miedzy instancjami |
| P3 | OPS-001 | Staging environment | 1d | Bezpieczniejsze deploymenty |
| P3 | OPS-007 | Monitoring (Prometheus + Grafana lub Cloud Monitoring) | 1d | Visibility |
| P3 | TEST-004 | Integration tests z Docker PostgreSQL | 2d | Real DB coverage |
| P3 | ARCH-F05 | Shared types (OpenAPI spec lub monorepo) | 2d | Type safety FE-BE |
| P3 | API-004 | Token refresh mutex | 4h | Eliminuje race conditions |
| P3 | SEC-001b | BFG Repo Cleaner (czyszczenie historii) | 2h | Czysty git history |
| P3 | FE-003 | Usun nieuzywane shadcn/ui komponenty | 1h | Czyste repo |

## Nice to Have (backlog)

| Priorytet | ID | Opis | Effort | Impact |
|-----------|-----|------|--------|--------|
| P4 | ARCH-F03 | Warstwa DTO/response mapping | 2d | Lepszy kontrakt API |
| P4 | SEC-008 | Zmniejsz JSON body limit do 1MB | 5min | DDoS protection |
| P4 | SEC-009 | Zmniejsz upload limit do 50MB | 5min | Memory protection |
| P4 | UX-004 | Precyzyjne time range labels | 30min | Jasnosc |
| P4 | UX-005 | Breadcrumbs/back nav | 1h | Nawigacja |
| P4 | UX-006 | Statystyki na profilu | 2h | Bogate profile page |
| P4 | FE-006 | i18n (jesli planowany angielski) | 2d | Lokalizacja |
| P4 | FE-012 | Sync settings z backendem | 4h | Cross-device settings |
| P4 | A11Y-007 | Focus trap w mobile menu | 1h | a11y compliance |
| P4 | PERF-004 | AnimatedBackground disable na mobile | 30min | Battery/performance |
| P4 | OPS-008 | min-instances=1 (cold start) | 5min | Szybszy pierwszy request |
| P4 | OPS-009 | NODE_OPTIONS w Dockerfile | 5min | OOM protection |

---

## Timeline Estimate

```
Tydzien 1: Immediate Critical + Quick Wins
Tydzien 2-3: Next Sprint items
Miesiac 2: Strategic Refactors (Redis, staging, monitoring)
Ongoing: Nice to Have (backlog)
```
