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
| Sync | Cloud Scheduler job `spotistats-sync-history`, every hour (`0 * * * *`, Europe/Warsaw; also keeps Supabase from pausing) |
| Deploy | GitHub Actions on merge to `main` (`main` requires a PR) |

Runtime: Node 22 (Node 20 is EOL since 2026-04-30). Backend image sets `TZ=Europe/Warsaw`; SQL
hour/weekday stats use `APP_TIMEZONE` (default `Europe/Warsaw`) because `playedAt` is stored in UTC.

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

## Spotify API limits (Development Mode, state 2026-11)

Full research with sources: [AUDIT/15_REVIEW_2026-11-21.md](../AUDIT/15_REVIEW_2026-11-21.md#2-research-spotify-web-api-w-2026-tryb-development).

- Still available: `GET /me/top/{type}`, `GET /me/player/recently-played`, `GET /search` (max `limit` 10).
- Removed fields: `popularity` (artist/track/album), artist `followers`, `/me` `email`/`country`/`product`.
- Removed endpoints: batch `GET /tracks|/artists|/albums`, `audio-features`, `recommendations` — do not add code that needs them.
- Quota is counted per developer account (July 2026); exceeding it returns 429 with `"reason": "QUOTA_EXCEEDED"`.
- Owner needs Premium; max 5 users per dev-mode app.

## History collection gap

`recently-played` returns at most the last 50 tracks (~2–3 h of music). Since 2026-11-21 the sync job runs
**every hour** (was every 6 h, which lost plays on long listening days). The dashboard also syncs whenever it is open.

```bash
gcloud scheduler jobs list --project spotistats-prod-482419 --location europe-central2
gcloud scheduler jobs update http spotistats-sync-history --schedule="0 * * * *" --project spotistats-prod-482419 --location europe-central2
```

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

## Data collection

- Logout does **not** stop hourly collection; `POST /auth/disconnect` (Profile → "Zatrzymaj zbieranie") does.
- A user stops being collected only when Spotify answers `invalid_grant` (log `spotify_grant_revoked`,
  `User.spotifyGrantRevokedAt` set) — they must log in again.
- Health per user: `lastSyncAt` (last success), `lastSyncAttemptAt`, `lastSyncError`, `syncFailureCount`,
  `lastGapDetectedAt` (more than 50 plays between two syncs). Summary: `GET /api/cron/status`.
- The sync endpoint answers 500 when no user synced or Spotify rate-limited the run, so the Scheduler job
  shows the run as failed.
- API `msPlayed` = min(track length, time since previous play) — `played_at` is the end of playback.
  Full length is kept in `durationMs`.

## Alerts (Cloud Monitoring, free tier)

Setup: `OWNER_EMAIL=... bash docs/monitoring/setup-alerts.sh` (policies in `docs/monitoring/`).
Alert policies (notification channel: e-mail):

| Alert | Filter / condition |
|---|---|
| Sync errors | `resource.type="cloud_run_revision" AND jsonPayload.component="spotify-sync" AND severity>=ERROR` |
| Grant revoked | `resource.type="cloud_run_revision" AND jsonPayload.message="spotify_grant_revoked"` |
| No sync for 3 h (dead-man switch) | log-based counter metric on `jsonPayload.message="Cron collection completed"`, alert when absent for 3 h |
| Scheduler run failed | `resource.type="cloud_scheduler_job" AND resource.labels.job_id="spotistats-sync-history" AND severity>=ERROR` |

