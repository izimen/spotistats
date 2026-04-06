# AUDIT: Frontend / UI Engineering

## Ocena: 7/10

Nowoczesny frontend z dobrymi praktykami (lazy loading, code splitting, React Query, TypeScript). Glowne problemy: brak CSRF token w axios, brak testow, shadcn/ui overkill.

---

## Findings

### FE-001: Brak CSRF Token w Axios Interceptor
- **Severity:** HIGH
- **Lokalizacja:** `frontend/src/lib/api.ts`
- **Opis:** Axios nie wysyla `X-CSRF-Token` header. Backend Double Submit Cookie CSRF wymaga tego headera dla POST/PUT/DELETE. Bez niego, state-changing requesty powinny zwracac 403.
- **Wplyw:** Albo CSRF nie dziala, albo POST requesty failuja
- **Rekomendacja:** Dodaj response interceptor czytajacy `X-CSRF-Token` z response header i ustawiajacy go jako default header
- **Status:** ✅ FIXED (2026-04-06) — Dodano response interceptor (capture) + request interceptor (send on state-changing methods)

### FE-002: JWT w localStorage Zamiast Tylko Cookie
- **Severity:** Medium
- **Lokalizacja:** `frontend/src/pages/Callback.tsx:35`, `frontend/src/lib/api.ts:98`
- **Opis:** JWT jest przechowywany w `localStorage` (XSS-accessible) oprócz httpOnly cookie. Podwojne storage jest redundantne i zwieksza surface area.
- **Wplyw:** XSS moze wykrasc JWT z localStorage
- **Rekomendacja:** Ideally rely on httpOnly cookie only. Jesli cross-domain wymaga localStorage, rozważ krotkotrwale tokeny.
- **Status:** backlog

### FE-003: 40+ Nieuzywanych shadcn/ui Komponentow
- **Severity:** Low
- **Lokalizacja:** `frontend/src/components/ui/`
- **Opis:** Zainstalowano ~40 shadcn/ui komponentow, ale uzywa sie tylko kilku (button, card, toast, tooltip, tabs, badge, skeleton, progress). Reszta (accordion, alert-dialog, calendar, carousel, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, slider, sonner, switch, table, textarea, toggle, toggle-group) to dead code.
- **Wplyw:** Zaden wplyw na bundle (tree shaking), ale brudzi repo i utrudnia nawigacje
- **Rekomendacja:** Usun nieuzywane komponenty shadcn/ui
- **Status:** backlog

### FE-004: Brak Testow Frontend
- **Severity:** Medium
- **Lokalizacja:** Brak katalogu `frontend/tests/` lub `__tests__/`
- **Opis:** Zero testow frontendowych (unit, integration, e2e)
- **Wplyw:** Brak regressiontestow, kazda zmiana to ryzyko
- **Rekomendacja:** Dodaj Vitest + React Testing Library dla kluczowych hookow i komponentow
- **Status:** backlog

### FE-005: useSpotifyData - any Types
- **Severity:** Low
- **Lokalizacja:** `frontend/src/hooks/useSpotifyData.ts:130`
- **Opis:** `plays: any[]` - brak silnych typow dla danych z API
- **Wplyw:** Brak type safety, trudniejsze debugowanie
- **Rekomendacja:** Zdefiniuj interfejsy dla wszystkich API responses
- **Status:** backlog

### FE-006: Hardcoded Polish Strings
- **Severity:** Low
- **Lokalizacja:** Wszystkie strony i komponenty
- **Opis:** Wszystkie teksty UI sa hardcoded po polsku. Brak i18n.
- **Wplyw:** Brak mozliwosci lokalizacji. OK jesli app jest tylko po polsku.
- **Rekomendacja:** Akceptowalne na obecnym etapie, ale rozwazyc i18next jesli planowana ekspansja
- **Status:** backlog

### FE-007: Build Artifacts w Repo (dist/)
- **Severity:** Medium
- **Lokalizacja:** `frontend/dist/`
- **Opis:** Skompilowane pliki JS/CSS w repo. Powinny byc generowane w CI/CD, nie commitowane.
- **Wplyw:** Konflikty merge, niepotrzebne zwiększanie rozmiaru repo
- **Rekomendacja:** Dodaj `dist/` do `.gitignore`, usun z repo
- **Status:** ✅ FIXED (2026-04-06) — Dodano do .gitignore

### FE-008: Git Internals w frontend/
- **Severity:** Medium
- **Lokalizacja:** `frontend/HEAD`, `frontend/hooks/`, `frontend/objects/`, `frontend/refs/`, `frontend/packed-refs`, `frontend/index`, `frontend/info/`, `frontend/logs/`, `frontend/config`, `frontend/description`
- **Opis:** Pliki wewnetrzne git (prawdopodobnie z `.git` subdirectory) zostaly przypadkowo skopiowane do katalogu frontend
- **Wplyw:** Wyciek informacji o strukturze git, zbedne pliki w repo i Docker image
- **Rekomendacja:** Usun te pliki, dodaj do `.gitignore`
- **Status:** ✅ FIXED (2026-04-06) — Dodano do .gitignore (hooks/, objects/, refs/, HEAD, packed-refs)

### FE-009: bun.lockb obok package-lock.json
- **Severity:** Low
- **Lokalizacja:** `frontend/bun.lockb`
- **Opis:** Dwa lockfile'y od roznych package managerow (npm i bun). Moze powodowac niespojne dependency resolution.
- **Wplyw:** Potencjalne niespojnosci
- **Rekomendacja:** Usun `bun.lockb` jesli uzywasz npm, lub odwrotnie
- **Status:** backlog

### FE-010: Nieuzywany use-toast.ts (duplikat)
- **Severity:** Low
- **Lokalizacja:** `frontend/src/hooks/use-toast.ts` i `frontend/src/components/ui/use-toast.ts`
- **Opis:** Dwa pliki toast hook z identyczna lub podobna zawartoscia
- **Wplyw:** Mozliwe importy z niewlasciwego pliku
- **Rekomendacja:** Usun duplikat, zjednocz importy
- **Status:** backlog

### FE-011: utilities-backup.css
- **Severity:** Low
- **Lokalizacja:** `frontend/src/styles/utilities-backup.css`
- **Opis:** Plik backup CSS - prawdopodobnie nieuzywany
- **Wplyw:** Dead code
- **Rekomendacja:** Zweryfikuj i usun jesli nieuzywany
- **Status:** backlog

### FE-012: Settings Hook Bez Backendu
- **Severity:** Low
- **Lokalizacja:** `frontend/src/hooks/useSettings.ts`
- **Opis:** Ustawienia (powiadomienia, prywatnosc, odtwarzanie) sa przechowywane tylko w localStorage. Brak synchronizacji z backendem.
- **Wplyw:** Ustawienia gubione przy zmianie przegladarki/urzadzenia
- **Rekomendacja:** OK na obecnym etapie, ale opisac w UI ze ustawienia sa lokalne
- **Status:** backlog
