# Tech Stack Research - Podsumowanie (2026)

Wyniki 4 rownolegych agentow researchowych z dostepem do internetu.

---

## VERDYKTY: Co Trzymac, Co Upgradowac, Co Zmienic

### NATYCHMIAST (P0 - przed nastepnym deploy)

| Technologia | Obecna | Najnowsza | Verdykt | Effort |
|-------------|--------|-----------|---------|--------|
| **Express.js** | 4.21 | **5.2.1** (stable od Sep 2024) | **UPGRADE** - async error handling, Express 4 w maintenance | 2-4h |
| **Prisma** | 5.22 | **7.6.0** | **UPGRADE** - 2 major wersje do tylu | 2-4h |
| **Auth architektura** | JWT w URL + access token w JWT + localStorage | httpOnly cookie only | **NAPRAW** - najwyzszy priorytet bezpieczenstwa | 4-8h |

### KROTKOTERMINOWO (P1 - nastepny sprint)

| Technologia | Obecna | Najnowsza | Verdykt | Effort |
|-------------|--------|-----------|---------|--------|
| **React** | 18.3 | **19.2.4** (stable 16 miesiecy) | **UPGRADE** - React Compiler, auto-memoization | 4-6h |
| **Vite** | 5.4 | **8.0.3** (target: 7.x) | **UPGRADE** do 7.x - 3 major wersje za | 1-2h |
| **Recharts** | 2.15 | **3.8.1** | **UPGRADE** - simple chart usage | 30-60min |
| **Sentry** | nie zainstalowany | 10.47.0 | **ZAINSTALUJ** - monitoring w produkcji | 1h |

### SREDNIOTERMINOWO (P2 - po stabilizacji)

| Technologia | Obecna | Najnowsza | Verdykt | Effort |
|-------------|--------|-----------|---------|--------|
| **TailwindCSS** | 3.4 | **4.x** (sty 2025) | **UPGRADE** - duza zmiana, nowy Oxide engine | 4-6h |
| **React Router** | 6.30 | **7.x** | **UPGRADE** razem z React 19 | 1-2h |

### TRZYMAJ (bez zmian)

| Technologia | Obecna | Dlaczego trzymac |
|-------------|--------|-----------------|
| **shadcn/ui** | latest | Nadal dominujaca biblioteka komponentow, aktywnie rozwijana |
| **Axios** | 1.13 | Zaawansowany interceptor chain (JWT refresh, rate limit, multi-tab) - zamiana na fetch ryzykowna |
| **TanStack Query** | 5.83 | Najlepsza biblioteka do data fetching w React |
| **Zod** | v4 (backend) v3 (frontend) | Stabilne, split wersji OK (brak wspoldzielonych schemas) |
| **Cloud Run** | GCP | Koszt $0-10/mies, operacyjna prostota, nie ma powodu do migracji |
| **Supabase** | PostgreSQL | Dobry hosting, darmowy tier wystarczajacy |
| **jsonwebtoken** | 9.0.3 | Aktualny (update Dec 2025), jose lepsza ale migracja niepotrzebna |
| **Helmet** | 8.0 | Standard dla Express security headers |

### NIE MIGRUJ (rozwazone i odrzucone)

| Alternatywa | Vs Obecna | Dlaczego nie |
|-------------|-----------|-------------|
| **Fastify/Hono/Elysia** | Express | Brak meaningful benefitu dla I/O-bound app z Express middleware |
| **Drizzle ORM** | Prisma | Drizzle nadal pre-1.0 (0.45.2), migracja 15-25h za nic |
| **Native fetch** | Axios | Oszczednosc ~13KB ale ryzyko bledow w auth interceptor chain |
| **Fly.io/Railway** | Cloud Run | Cloud Run tanszy i prostszy dla tego use case |
| **Memorystore Redis** | In-memory | $42+/mies, overkill; Upstash free tier jesli kiedykolwiek potrzebny |
| **Nivo/Victory/Chart.js** | Recharts | Recharts 3 aktywnie rozwijany, prosty use case |

---

## Kluczowe Odkrycia z Researchu

### Backend
- **Express 5** jest teraz `latest` na npm (od Dec 2025). Express 4 przeniesiony na `latest-4` maintenance tag. Glowna zmiana: automatyczne forwarding rejected promises w async handlerach.
- **Prisma 7.6.0** - projekt jest 2 major wersje do tylu. Upgrade przyniesie lepszy performance i nowe features.
- **Zod v4** jest stabilny (4.3.6 na npm). Split v3/v4 miedzy front/back jest akceptowalny.

### Frontend
- **React 19** stabilny od 16 miesiecy. React Compiler (stable od Oct 2025) daje automatic memoization. Projekt ma 164 `forwardRef` usages ale codemods i shadcn regen to pokryja.
- **Vite 8.0.3** jest aktualne ale target powinien byc **Vite 7** (stable od Jun 2025). Vite 8 za nowy.
- **Tailwind v4** to pelna zmiana architektury - CSS-first config, Oxide engine. Zautomatyzowane narzedzie migracji pokrywa 80-90%.

### Security
- **CSRF jest prawdopodobnie zlamany w produkcji** - frontend nie wysyla tokenu, a legacy X-Requested-With fallback zostal usuniety. Cos jest bypassowane lub POST requesty failuja.
- **SameSite=Lax na JWT cookie** juz zapewnia podstawowa ochrone CSRF. Double Submit Cookie to defense-in-depth.
- **In-memory rate limiting jest nieskuteczny** na Cloud Run z autoscalingiem (kazda instancja ma wlasne countery).

### Infrastruktura
- **Cloud Run** jest wlasciwym wyborem. Wlaczyc `--cpu-boost` (darmowe, -40-60% cold start).
- **Sentry middleware jest juz zakodowany** ale pakiet nie jest zainstalowany. 1h fix daje production error visibility.
- **Redis niepotrzebny** na obecna skale. Jesli kiedys potrzebny - Upstash Redis (free tier, HTTP-based, serverless-friendly) zamiast Memorystore ($42+/mies).
- **CI/CD nie uruchamia testow** - dodac test step, naprawic broken testy, dodac concurrency control.

---

## Rekomendowana Kolejnosc Upgradow

```
Faza 1 (TERAZ):     Security fixes + Express 4->5 + Prisma 5->7
Faza 2 (Sprint 1):  Vite 5->7 + React Router 6->7
Faza 3 (Sprint 1):  React 18->19 + Recharts 2->3 + shadcn/ui regen
Faza 4 (Sprint 2):  Tailwind 3->4 + shadcn/ui regen
Faza 5 (Sprint 2):  Install Sentry + Cloud Run --cpu-boost
```

**Laczny effort szacunkowy:** 20-35 godzin roboczych

---

## Szczegolowe Raporty (pelne analizy)

| Raport | Plik | Linie | Confidence |
|--------|------|-------|------------|
| Backend | `.planning/codebase/RESEARCH_BACKEND.md` | 382 | HIGH (npm verified) |
| Frontend | `.planning/codebase/RESEARCH_FRONTEND.md` | 392 | HIGH (npm verified) |
| Security | `.planning/codebase/RESEARCH_SECURITY.md` | 526 | MEDIUM (training data) |
| Infra | `.planning/codebase/RESEARCH_INFRA.md` | 600 | MEDIUM (training data) |

**Uwaga:** Agenty Backend i Frontend zweryfikowaly wersje przez npm registry. Agenty Security i Infra nie mialy dostepu do WebSearch - opieraly sie na training data (do May 2025). Ceny i nowe features GCP/Sentry/Upstash wymagaja weryfikacji na zywych stronach.
