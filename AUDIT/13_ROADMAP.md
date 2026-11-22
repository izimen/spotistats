# AUDIT: Roadmap

**Ostatnia aktualizacja:** 2026-11-22 (zbieranie danych [16](16_DATA_COLLECTION_2026-11-22.md), redesign i logo [17](17_REDESIGN_2026-11-22.md))

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

## PRZEGLAD 2026-11-21 — ZROBIONE (galaz `perf/review-2026-11-21`)

Wydajnosc backendu i frontendu, strefa czasowa, Node 22, npm audit, 30 nieuzywanych zaleznosci usunietych.
Potem: DATA-301 (sync co godzine, juz na produkcji), UX-301 (Profil sluchacza zamiast falszywego DNA), F1-F7 (strona `/summary`).
Lista: [11_APPLIED_FIXES_CHANGELOG.md](11_APPLIED_FIXES_CHANGELOG.md#przeglad-2026-11-21--galaz-perfreview-2026-11-21).

## 2026-11-22 — ZROBIONE

Zbieranie danych (#54, #55), redesign „gig poster” (#56), logowanie z winylem (#57), logo i README (#58), cache faviconu (#59).
Lista: [11_APPLIED_FIXES_CHANGELOG.md](11_APPLIED_FIXES_CHANGELOG.md). Stary wyglad: branch `archive/old-look`.

## Czeka na wlasciciela

| Co | Gdzie |
|----|-------|
| 6 uzytkownikow ma sie raz zalogowac (zbieranie wroci) | — |
| Zgoda na e-mail do alertow | `OWNER_EMAIL=... bash docs/monitoring/setup-alerts.sh` |
| Social preview repo | GitHub → Settings → Social preview → `docs/brand/banner.png` |

## NOWE — do decyzji (2026-11-21, uzupelnione 2026-11-22)

| ID | Opis | Effort | Priorytet |
|----|------|--------|-----------|
| IMP-01 | Import RODO: deduplikacja z danymi z API (±5 s, import wygrywa) + przebudowa `AggregatedStats` przy imporcie (ponowny import podwaja liczniki) | 0,5 d | HIGH (przed pierwszym importem) |
| COL-10 | Flaga `isCountedPlay` (< 30 s), znaczek "dane niepelne" przy `lastGapDetectedAt`, klucz unikalny `(userId, playedAt)` dla API | 0,5 d | LOW |
| DEP-301 | Majory: Prisma 7, Express 5, React 19, react-router 7, Vite 7, Tailwind 4, stream-json 3. Vite i react-router naprawia czerwony „Security Scan” (czerwony od 2026-06) | osobne PR-y | MEDIUM |
| ONB-01 | Ekran powitalny po pierwszym logowaniu + widoczny import pliku RODO w Koncie (pelna historia od razu, jak w stats.fm) | 1 d | MEDIUM (po IMP-01) |

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
| UX-005 | Breadcrumbs/back nav na subpages | 1h | LOW |
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
| PERF-006 | Lepsza Vite chunk strategy | 30min |
| PERF-008 | Connection pooling config w DATABASE_URL | 15min |

---

## Statystyki Projektu

| Metryka | Wartosc |
|---------|---------|
| PRy zmergowane | 11 (#31-#41) w ETAPIE 2/3, potem #42-#59 |
| Poprawki kodu | ~55 |
| Sekrety zrotowane | 6 |
| Migracje DB | 2 |
| Testy backend | 105 pass (2026-11-22) |
| Testy frontend | 33 pass (2026-11-22) |
| Pliki usuniete | 40+ (shadcn/ui, junk) |
| Linie usuniete | ~4,000+ |
| Vulnerabilities HIGH | 0 (npm audit clean) |
| CI/CD | testy + deploy + smoke test + security scan |
