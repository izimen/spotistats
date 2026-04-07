# SpotiStats — Project Instructions

## Stack
- **Backend:** Node.js 20, Express 4, Prisma ORM 5, PostgreSQL (Supabase)
- **Frontend:** React 18, TypeScript, Vite 5, TailwindCSS 3, shadcn/ui (Radix)
- **Deployment:** Google Cloud Run, GitHub Actions CI/CD
- **Auth:** Spotify OAuth2 + PKCE, JWT, refresh token rotation with AES-256-GCM encryption

## Spotify API Rules
Follow `SPOTIFY_API_RULES.md` for all Spotify Web API work. Key points:
- Authorization Code with PKCE flow only (no Implicit Grant)
- Redirect URIs: HTTPS only (except http://127.0.0.1 for dev)
- Minimum scopes only
- Access token stored encrypted server-side in DB (not in JWT)
- Respect Retry-After header on 429, exponential backoff
- Check endpoints against `docs/spotify-openapi-schema.yaml`

## Architecture Decisions
- JWT contains only: userId, spotifyId, tokenFamily, tokenVersion (SEC-004)
- Auth code flow: callback redirects with ?code=, frontend exchanges via POST /auth/exchange (SEC-003)
- Auth codes stored in DB (not memory Map) for Cloud Run multi-instance compatibility
- Streaming JSON parser (stream-json) for import files (PERF-002)
- CSRF: Double Submit Cookie pattern, skip /auth/exchange and /api/v1/cron/

## Testing
- Backend: Jest (`npm test` from backend/) — 53 tests
- Frontend: Vitest (`npm test` from frontend/) — 22 tests
- CI: test-backend job runs before deploy, smoke test after deploy

## Conventions
- Commits: imperative, no Co-Authored-By lines
- PRs: always through feature branch, never push directly to main
- Polish language in UI, ASCII in code (no Polish chars in source files)
- Error responses: RFC 7807 Problem Details format

## Key Files
- `backend/src/controllers/authController.js` — OAuth flow, JWT, token refresh
- `backend/src/controllers/statsController.js` — All stats endpoints, token mutex
- `backend/src/middleware/protect.js` — JWT auth, select clause (no refreshToken leak)
- `backend/src/services/importService.js` — Streaming JSON parser, parameterized SQL
- `frontend/src/lib/api.ts` — Axios client, CSRF interceptors, token refresh
- `frontend/src/hooks/useSpotifyData.ts` — All API hooks with TypeScript interfaces

## GCP
- Project: `spotistats-prod-482419`
- Region: `europe-central2`
- Backend: `spotistats-backend` (512MB, port 5000)
- Frontend: `spotistats-frontend` (256MB, port 8080, nginx)
- Secrets: JWT_SECRET, ENCRYPTION_KEY, CRON_SECRET_KEY, SPOTIFY_CLIENT_SECRET, DATABASE_URL, DIRECT_URL

## Audit Status
See `AUDIT/` directory — 16 documents, ~55 fixes applied, security rating 9/10.
Remaining backlog in `AUDIT/13_ROADMAP.md`.
