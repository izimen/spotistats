# SpotiStats — notes for Claude

Personal Spotify stats app. Owner talks Polish; UI copy is Polish and gender-neutral.

## Where things are

- Backend: `backend/` (Node 22, Express, Prisma 5, Postgres on Supabase). Frontend: `frontend/` (React 18, Vite 5, Tailwind 3).
- Live state, URLs, costs, Spotify dev-mode limits, collection, alerts, caching, rollback: `docs/OPERATIONS.md`.
- Design system and logo: `UI_DESIGN_SYSTEM.md`, `docs/brand/`. History of decisions: `AUDIT/INDEX.md` (latest: 16, 17).
- Roadmap / open items: `AUDIT/13_ROADMAP.md`.

## How to ship

- Never push to `main`; branch → PR → merge. Merge to `main` deploys both services via GitHub Actions (~3 min).
  Watch with `gh run watch <id> --exit-status`.
- PR gate is only Snyk. "Security Scan" is red on `main` since 2026-06 (old vite/react-router) and does not block.
- Migrations do not run on deploy: `npx prisma migrate deploy` in `backend/` with `DATABASE_URL`/`DIRECT_URL` from
  Secret Manager. Check each production step's exit code separately.
- Lockfiles: regenerate with npm 10 (`npx -y npm@10 install --package-lock-only`), verify `npx -y npm@10 ci`.
- gcloud: always `--project spotistats-prod-482419`, region `europe-central2`.
- Never commit the unrelated `Projektowanie*` files in the repo root (use `':!Projektowanie*'`).

## Checks

- Backend: `cd backend && npm test` (105). Frontend: `cd frontend && npx vitest run` (33), `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`.
- UI without backend: `VITE_PREVIEW_MODE=true npx vite --port 5199` in `frontend/` (mock data).
- Screenshots: Playwright via `playwright-core` with the local Chromium (`%LOCALAPPDATA%/ms-playwright/chromium-*/chrome-win64/chrome.exe`).
  In Git Bash set `MSYS_NO_PATHCONV=1` when passing URL paths like `/`.

## Facts worth remembering

- Spotify `played_at` (and GDPR `ts`) is the END of playback; real `msPlayed` = min(track length, gap to previous play).
- recently-played returns max 50 items; the hourly Cloud Scheduler job `spotistats-sync-history` is the only way to keep history.
- Logout must not clear the Spotify refresh token; PKCE refresh tokens rotate and must be saved.
- Files in `frontend/public/` are cached 1 day; when replacing one under the same name, bump `?v=` in `index.html`.
- Previous look is on branch `archive/old-look`.
