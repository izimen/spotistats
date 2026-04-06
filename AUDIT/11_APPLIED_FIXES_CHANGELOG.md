# AUDIT: Applied Fixes Changelog

**Status:** ETAP 2 - Wdrazanie poprawek
**Data wdrozenia:** 2026-04-06
**Wdrozyl:** AI Audit Team (Claude Code)

---

## Wdrozone Poprawki

### Batch 1: Critical Security

| ID | Opis | Plik | Status | Notatki |
|----|------|------|--------|---------|
| SEC-002 | SQL injection fix -> parameterized queries | importService.js:132-145 | DONE | Zamieniono `$executeRawUnsafe` z interpolacja na `$executeRaw` z `Prisma.sql` tagged template i `Prisma.join` |
| SEC-005 | CSRF token w frontend axios | api.ts | DONE | Dodano response interceptor (wyciaga X-CSRF-Token) i request interceptor (wysyla go na POST/PUT/DELETE/PATCH) |
| SEC-006 | Null origin CORS bypass | app.js:68 | DONE | Null origin dozwolony tylko w development, zablokowany w production |
| SEC-016 | Select clause w protect.js | protect.js:54, authController.js:223 | DONE | refreshToken usuniety z req.user, refresh() pobiera go bezposrednio z DB |
| SEC-019 | encodeURIComponent na error redirect | authController.js:99 | DONE | Zakodowany parametr error w OAuth redirect |

### Batch 2: Structural Cleanup

| ID | Opis | Pliki | Status | Notatki |
|----|------|-------|--------|---------|
| FE-007/008 | Gitignore update | .gitignore | DONE | Dodano frontend/hooks/, objects/, refs/, HEAD, packed-refs, dist/, AUDIT/ |

### Batch 3: Code Quality

| ID | Opis | Pliki | Status | Notatki |
|----|------|-------|--------|---------|
| SEC-013 | Usun env z /health | app.js:110 | DONE | Usunieto `env: env.nodeEnv` z health response |
| SEC-008 | Zmniejsz JSON body limit | app.js:88 | DONE | Zmniejszono z 10MB na 1MB |
| SEC-009 | Zmniejsz upload limit | import.routes.js:17, :34 | DONE | Zmniejszono z 200MB/100MB na 50MB |

### Batch 5: Tests

| ID | Opis | Pliki | Status | Notatki |
|----|------|-------|--------|---------|
| TEST-001 | Fix rbac reference w security.test.js | security.test.js:197-219 | DONE | Usunieto testy RBAC (rbac.js nie istnieje) |
| TEST-002 | Update CSRF test | security.test.js:119-129 | DONE | Zamieniono legacy X-Requested-With test na Double Submit Cookie test |
| TEST-FIX | Fix API route paths w testach | security.test.js | DONE | Zmieniono /api/stats/ na /api/v1/stats/ i /api/profile na /api/v1/profile |

---

## Podsumowanie

| Kategoria | Wdrozone | Pozostale |
|-----------|----------|-----------|
| Critical Security | 5 | 0 (P0 code fixes done) |
| Structural Cleanup | 1 | 4 (bun.lockb, backup css, patch) |
| Code Quality | 3 | 4 (API-002, API-003, API-007, API-009) |
| Tests | 3 | 0 |
| Performance | 0 | 4 |
| Accessibility | 0 | 3 |
| DevOps | 0 | 2 |

## Zmiany Wymagajace Recznej Decyzji (NIE wdrozone)

| ID | Opis | Dlaczego wymaga decyzji |
|----|------|----------------------|
| SEC-001 | Rotacja sekretow | Wymaga dostepu do Supabase, Spotify Dashboard, GCP Secret Manager |
| SEC-001b | Czyszczenie git history (BFG) | Nieodwracalna operacja na repozytorium |
| SEC-003 | Zmiana JWT-in-URL na auth code flow | Duza zmiana architektonczna |
| SEC-004 | Przeniesienie access token z JWT server-side | Duza zmiana architektonczna |
| OPS-001 | Staging environment | Wymaga dodatkowych zasobow GCP |
