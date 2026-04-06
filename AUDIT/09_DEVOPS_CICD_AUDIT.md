# AUDIT: DevOps / CI-CD / Config / Operations

## Ocena: 6/10

CI/CD dziala (deploy na push to main), security scan z Gitleaks, Docker multi-stage builds. Brak staging env, brak smoke tests po deploy, brak monitoring/alerting.

---

## Findings

### OPS-001: Brak Staging Environment
- **Severity:** HIGH
- **Lokalizacja:** `.github/workflows/deploy.yml`
- **Opis:** Push to main -> deploy prosto na produkcje. Brak staging/preview environment.
- **Wplyw:** Kazdy merge to ryzyko produkcyjnego incydentu
- **Rekomendacja:** Dodaj staging deployment (np. na osobnym Cloud Run service) uruchamiany na PR
- **Status:** backlog

### OPS-002: Brak Smoke Tests po Deploy
- **Severity:** HIGH
- **Lokalizacja:** `.github/workflows/deploy.yml`
- **Opis:** Deploy konczy sie na `gcloud run deploy`. Brak weryfikacji ze serwis dziala po deploymencie.
- **Wplyw:** Uszkodzony deploy moze nie byc wykryty
- **Rekomendacja:** Dodaj step `curl $BACKEND_URL/health` po deploy i fail workflow jesli nie 200
- **Status:** backlog

### OPS-003: Brak npm test w CI/CD
- **Severity:** HIGH
- **Lokalizacja:** `.github/workflows/deploy.yml`
- **Opis:** Pipeline nie uruchamia testow przed deploy. Kod z failujacymi testami moze byc deployowany.
- **Wplyw:** Brak quality gate
- **Rekomendacja:** Dodaj job `test` przed `deploy-backend` z `npm test`
- **Status:** backlog

### OPS-004: Security Scan continue-on-error
- **Severity:** Medium
- **Lokalizacja:** `.github/workflows/security-scan.yml:39`
- **Opis:** `continue-on-error: true` na `npm audit` - vulnerabilities nie blokuja merge
- **Wplyw:** Known vulnerabilities moga byc ignorowane
- **Rekomendacja:** Usun `continue-on-error` i napraw vulnerabilities, lub dodaj allowlist
- **Status:** backlog

### OPS-005: Brak ENCRYPTION_KEY w CI/CD Secrets
- **Severity:** Medium
- **Lokalizacja:** `.github/workflows/deploy.yml:60`
- **Opis:** `--set-secrets` nie zawiera `ENCRYPTION_KEY`. Backend fallback do JWT_SECRET z warningiem.
- **Wplyw:** Enkrypcja tokenow uzywa tego samego klucza co JWT signing
- **Rekomendacja:** Dodaj `ENCRYPTION_KEY` do GCP Secret Manager i do `--set-secrets`
- **Status:** backlog

### OPS-006: Docker Build Kopiuje Caly Kontekst
- **Severity:** Medium
- **Lokalizacja:** `frontend/Dockerfile:12`
- **Opis:** `COPY . .` kopiuje caly katalog frontend do buildera, wlacznie z git internals, dist/, node_modules (jesli istnieja)
- **Wplyw:** Wiekszy Docker build context, dluzszy build, potencjalne wycieki
- **Rekomendacja:** Dodaj/zaktualizuj `.dockerignore`:
  ```
  .git
  hooks/
  objects/
  refs/
  logs/
  HEAD
  packed-refs
  index
  info/
  config
  description
  dist/
  node_modules/
  bun.lockb
  ```
- **Status:** backlog

### OPS-007: Brak Monitoring/Alerting
- **Severity:** Medium
- **Lokalizacja:** Caly projekt
- **Opis:** `prom-client` i `@sentry/node` sa referencowane w kodzie ale NIE SA w dependencies. Metrics i Sentry sa stubs (gracefully degrade to noop).
- **Wplyw:** Brak visibility w performance, bledy, health
- **Rekomendacja:** Albo zainstaluj i skonfiguruj (dodaj do package.json), albo usun kod metryk/sentry
- **Status:** backlog

### OPS-008: Cloud Run min-instances=0
- **Severity:** Low
- **Lokalizacja:** `.github/workflows/deploy.yml:57-58`
- **Opis:** `--min-instances=0` dla obu serwisow. Cold start na kazdym pierwszym requeście po inactivity.
- **Wplyw:** Cold start delay (~2-5s) dla pierwszego uzytkownika
- **Rekomendacja:** Rozwazyc `--min-instances=1` jesli budzet pozwala
- **Status:** backlog

### OPS-009: Brak Resource Limits w Backend Dockerfile
- **Severity:** Low
- **Lokalizacja:** `backend/Dockerfile`
- **Opis:** Brak NODE_OPTIONS z --max-old-space-size. Cloud Run daje 512Mi ale Node moze sprobowac uzyc wiecej.
- **Wplyw:** Potencjalny OOM kill
- **Rekomendacja:** Dodaj `ENV NODE_OPTIONS="--max-old-space-size=400"` w Dockerfile
- **Status:** backlog

### OPS-010: Frontend VITE_API_URL Baked w Build
- **Severity:** Low
- **Lokalizacja:** `frontend/Dockerfile:17-18`
- **Opis:** `VITE_API_URL` jest build-time variable (baked into JS). Zmiana backend URL wymaga rebuild frontendu.
- **Wplyw:** Tight coupling deployment frontend-backend
- **Rekomendacja:** Akceptowalne - to standardowe podejscie dla Vite SPA
- **Status:** backlog
