# SpotiStats — operations

Live state and how to keep it running. Secrets are never written here — they live in GCP Secret Manager.

## Where it runs

| What | Where |
|---|---|
| Frontend | https://spotistats-frontend-ox6p5to4qa-lm.a.run.app (Cloud Run `spotistats-frontend`) |
| Backend | https://spotistats-backend-ox6p5to4qa-lm.a.run.app (Cloud Run `spotistats-backend`) |
| GCP project | `spotistats-prod-482419`, region `europe-central2` |
| Billing account | `01F7FF-EE2A00-817F1D` (the old `015E78-5F4016-A73C41` is closed) |
| Database | Supabase project `fcidlslrrzgpahtbtrrw` (eu-west-1), Postgres 17 |
| Sync | Cloud Scheduler, every 6 h (also keeps Supabase from pausing) |
| Deploy | GitHub Actions on merge to `main` (`main` requires a PR) |

Health: `GET /health` (process up), `GET /health/ready` (database reachable; 503 + `Retry-After` when not).

## Cost guards

- Both services scale to 0 instances when idle.
- Budget 5 PLN/month on the project, e-mail alerts at 50/90/100 % actual and 100 % forecast.
- Artifact Registry cleanup policy: keep the 5 newest images per service, delete older ones after 7 days.

## Revival 2026-10-29

The app was down since spring:

1. **Billing** — project was linked to a closed billing account, so Cloud Run stopped. Linked to the open account.
2. **Supabase** — the free project had been paused (status `INACTIVE`, DNS gone). Restored via the
   Management API (`POST /v1/projects/{ref}/restore`); all data kept (7 users). Then
   `npx prisma migrate deploy` applied `20261029_nullable_user_email`.
3. **Spotify API changes (Nov 2024 / Feb 2026)** — audio-features and recommendations return 403/404
   for apps without extended access; `/me` no longer returns `email`, `country`, `product` in
   development mode. Backend now degrades to empty results (blocked endpoints are not retried for 6 h),
   Discovery Roulette falls back to a genre search, and `User.email` is optional (PR #48).
4. **CSRF** — every POST from the frontend got 403: `X-CSRF-Token` was not exposed via CORS and the
   `SameSite=Strict` cookie is never sent cross-site (`*.a.run.app` frontend ↔ backend). Requests with
   `Authorization: Bearer …` now skip the CSRF check; the csrf cookie is `SameSite=None; Secure` (PR #50).
5. **Frontend** — anonymous visitors go straight to `/login`, CSP-blocked inline `onload` removed,
   typecheck/lint clean, stray copy of another git repo removed from `frontend/` (PR #49).

## If it breaks again

- **Supabase paused**: dashboard → project → *Restore project*, or with an access token:
  `curl -X POST -H "Authorization: Bearer $SUPABASE_TOKEN" https://api.supabase.com/v1/projects/fcidlslrrzgpahtbtrrw/restore`.
  Paused free projects can be restored for 90 days.
- **New migrations**: they do not run on deploy. In `backend/`, with `DATABASE_URL` and `DIRECT_URL`
  taken from Secret Manager: `npx prisma migrate deploy`.
- **Login fails at Spotify**: the app is in Development Mode — the owner needs Premium, and each user
  (max 5) must be added in the Spotify dashboard → *User Management*. Redirect URI must be exactly
  `https://spotistats-backend-ox6p5to4qa-lm.a.run.app/auth/callback`.
- **gcloud**: always pass `--project spotistats-prod-482419`.
