# AUDIT: Tests / QA / Reliability

## Ocena: 5/10

3 pliki testowe backend (53 testy, 53 pass), zero testow frontend. ~~Testy security referencuja nieistniejacy modul rbac.js.~~ FIXED. ~~Testy CSRF sa stale.~~ FIXED.

---

## Coverage Summary

| Obszar | Pliki testowe | LOC testow | Pokrycie |
|--------|--------------|------------|----------|
| Backend auth | 1 (auth.test.js) | 325 | Dobre: login redirect, callback, me, logout, PKCE, encryption |
| Backend business | 1 (business.test.js) | 304 | Czesc.: walidacja import, aggregation logic, edge cases |
| Backend security | 1 (security.test.js) | 196 | ✅ FIXED: RBAC testy usuniete, CSRF test -> Double Submit Cookie, route paths fixed |
| Frontend | 0 | 0 | BRAK |
| E2E | 0 | 0 | BRAK |
| Integration | 0 | 0 | BRAK |

---

## Findings

### TEST-001: security.test.js Referencuje Nieistniejacy rbac.js
- **Severity:** HIGH (testy failuja)
- **Lokalizacja:** `backend/tests/security.test.js:201-210`
- **Opis:** Test importuje `require('../src/middleware/rbac')` ale plik `backend/src/middleware/rbac.js` NIE ISTNIEJE. Test failuje z ModuleNotFoundError.
- **Wplyw:** Security regression tests nie dzialaja
- **Rekomendacja:** Usun testy RBAC lub stworz middleware rbac.js
- **Status:** ✅ FIXED (2026-04-06) — Blok testow RBAC usuniety z security.test.js

### TEST-002: CSRF Test Jest Staly
- **Severity:** HIGH
- **Lokalizacja:** `backend/tests/security.test.js:118-128`
- **Opis:** Test oczekuje, ze POST z `X-Requested-With: XMLHttpRequest` zwroci 200. Ale CSRF middleware zostal zaktualizowany i usuniety legacy X-Requested-With fallback. Test powinien failowac (lub CSRF middleware nadal ma fallback - niejasne).
- **Wplyw:** False confidence w security testach
- **Rekomendacja:** Zaktualizuj test do Double Submit Cookie pattern - wyslij X-CSRF-Token + csrf_token cookie
- **Status:** ✅ FIXED (2026-04-06) — Test uzywa teraz GET /health do pobrania CSRF tokena, potem wysyla cookie+header. Testy auth.test.js rowniez naprawione (logout, 404 handler, rate limit tolerance)

### TEST-003: Brak Testow Frontend
- **Severity:** HIGH
- **Lokalizacja:** Brak
- **Opis:** Zero testow frontendowych
- **Wplyw:** Brak regression protection dla UI
- **Rekomendacja:** Dodaj minimalne testy:
  - useSpotifyData hooks (mock API, verify data transformation)
  - Callback page (token extraction from URL)
  - api.ts interceptors (401 handling, refresh flow)
- **Status:** proposed

### TEST-004: Brak Integration Tests (Real DB)
- **Severity:** Medium
- **Lokalizacja:** Brak
- **Opis:** Wszystkie testy mockuja Prisma. Brak testow z prawdziwa baza danych.
- **Wplyw:** Mocked tests moga nie wykryc bledow migracji, constraints, lub zapytan
- **Rekomendacja:** Dodaj integration tests z Docker PostgreSQL (np. testcontainers)
- **Status:** proposed

### TEST-005: Business Tests - Mock-heavy, Shallow
- **Severity:** Medium
- **Lokalizacja:** `backend/tests/business.test.js`
- **Opis:** Wiele testow po prostu mockuje Prisma i sprawdza zwrocone wartosci mocka (np. "verify ordering" sprawdza hardcoded mock data). To testuje logike mockowania, nie logike biznesowa.
- **Wplyw:** Niski wartosc dodana testow
- **Rekomendacja:** Przetestuj REALNIE logike serwisow (np. importService.processStreamingHistory z prawdziwymi danymi i prawdziwa baza)
- **Status:** proposed

### TEST-006: Brak Test dla Import SQL Injection
- **Severity:** HIGH
- **Lokalizacja:** Brak
- **Opis:** Krytyczny bug SEC-002 (SQL injection w importService) nie jest pokryty zadnym testem
- **Wplyw:** Bug mogl byc wczesniej wychwycony
- **Rekomendacja:** Dodaj test z payloadem zawierajacym SQL injection w trackName/artistName
- **Status:** proposed

---

## Manual QA Checklist

### Krytyczne Flow

- [ ] **Login:** Kliknij "Zaloguj przez Spotify" -> OAuth -> Callback -> Dashboard
- [ ] **Dashboard:** Sprawdz czy Top Artist, Top Track, Genre Chart laduja sie poprawnie
- [ ] **Time Range:** Przelacz miedzy 4 Tygodnie / 6 Miesiecy / Caly czas -> dane sie aktualizuja
- [ ] **Top Artists:** Przejdz do /top-artists -> lista artystow z obrazami
- [ ] **Top Tracks:** Przejdz do /top-tracks -> lista utworow z duration
- [ ] **History:** Przejdz do /history -> lista odsuchanych utworow
- [ ] **Profile:** Przejdz do /profile -> dane konta
- [ ] **Logout:** Kliknij Wyloguj -> przekierowanie do /login
- [ ] **Session expired:** Poczekaj 7 dni (lub usun cookie) -> 401 -> redirect to /login
- [ ] **Import:** Upload Spotify Extended History JSON -> sukces

### Edge Cases

- [ ] **Nowy uzytkownik (brak historii):** Dashboard powinien pokazac empty states
- [ ] **Offline:** Wyswietl komunikat o braku polaczenia
- [ ] **Rate limited (429):** Toast z informacja o limicie
- [ ] **Large import (50k tracks):** Nie powinno OOM
- [ ] **Invalid JSON import:** Jasny komunikat bledu
- [ ] **Concurrent tabs:** Logout w jednym tabie -> logout w innych (multi-tab sync)

### Mobile

- [ ] **Responsywnosc:** Dashboard, Top Artists, Top Tracks, History na 375px width
- [ ] **Menu mobilne:** Hamburger -> lista nawigacji -> klikniecie zamyka menu
- [ ] **Touch targets:** Minimum 44x44px dla interaktywnych elementow
- [ ] **Safe area:** Brak zachodzenia na notch/gesture bar (safe-top, safe-bottom classes)
