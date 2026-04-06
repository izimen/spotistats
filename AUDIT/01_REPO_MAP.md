# AUDIT: Repository Map & Architecture

## Struktura Katalogow

```
spotistats/
├── .github/workflows/          # CI/CD: deploy.yml, security-scan.yml
├── .pre-commit-config.yaml     # Pre-commit hooks (trailing whitespace, gitleaks)
├── .gitignore                  # Root gitignore
├── backend/                    # Express.js API server
│   ├── .env                    # LOCAL ONLY (not tracked) - contains secrets!
│   ├── .env.example            # Template for environment variables
│   ├── .env.development.example
│   ├── .env.production.example
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile              # Multi-stage: node:20-alpine + prisma
│   ├── jest.config.js
│   ├── package.json            # Express, Prisma, JWT, Helmet, Multer, Zod
│   ├── prisma/
│   │   ├── schema.prisma       # 5 modeli: User, CachedTopItems, AggregatedStats, StreamingHistory, Import
│   │   ├── migrations/         # 6 migracji
│   │   └── rls_prisma_migrations.sql
│   ├── src/
│   │   ├── app.js              # Express app setup (middleware, routes)
│   │   ├── server.js           # Entry point, graceful shutdown
│   │   ├── config/
│   │   │   ├── env.js          # Env validation & export
│   │   │   └── spotify.js      # OAuth scopes & endpoints
│   │   ├── controllers/
│   │   │   ├── authController.js     # OAuth2+PKCE, JWT, refresh rotation
│   │   │   ├── statsController.js    # Top artists/tracks/albums, audio features, DNA
│   │   │   ├── importController.js   # Streaming history import
│   │   │   ├── cronController.js     # Scheduled sync jobs
│   │   │   └── profileController.js  # PLACEHOLDER (empty)
│   │   ├── middleware/
│   │   │   ├── protect.js      # JWT auth middleware
│   │   │   ├── csrf.js         # Double Submit Cookie CSRF
│   │   │   ├── cronAuth.js     # Bearer token auth for cron
│   │   │   ├── errorHandler.js # RFC 7807 error responses
│   │   │   ├── rateLimiter.js  # Express rate limit (memory/Redis)
│   │   │   ├── metrics.js      # Prometheus metrics (stub - prom-client not installed)
│   │   │   └── sentry.js       # Sentry error tracking (stub - @sentry/node not installed)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── stats.routes.js
│   │   │   ├── import.routes.js
│   │   │   ├── cron.routes.js
│   │   │   └── profile.routes.js  # PLACEHOLDER (empty router)
│   │   ├── services/
│   │   │   ├── spotifyService.js         # Spotify API wrapper + cache + circuit breaker
│   │   │   ├── encryptionService.js      # AES-256-GCM encryption
│   │   │   ├── pkceService.js            # PKCE state management
│   │   │   ├── importService.js          # Streaming history processing (SQL injection FIXED 2026-04-06)
│   │   │   ├── listeningHistoryService.js # History collection + aggregation
│   │   │   ├── musicDNAService.js        # Audio features analysis
│   │   │   ├── predictionService.js      # Time-contextual prediction
│   │   │   ├── discoveryService.js       # Music recommendations
│   │   │   └── auditService.js           # Audit logging
│   │   └── utils/
│   │       ├── prismaClient.js   # Prisma singleton
│   │       └── validation.js     # Zod schemas for import
│   └── tests/
│       ├── setup.js              # Test env + mocks
│       ├── auth.test.js          # Auth flow tests
│       ├── business.test.js      # Business logic tests
│       └── security.test.js      # Security regression tests (REFERENCES MISSING rbac.js)
│
├── frontend/                   # React SPA
│   ├── .env                    # LOCAL ONLY - VITE_API_URL
│   ├── .env.preview
│   ├── .gitignore
│   ├── Dockerfile              # Multi-stage: node:20-alpine build + nginx:alpine serve
│   ├── nginx.conf              # Production nginx config with security headers
│   ├── package.json            # React, Vite, shadcn/ui, Recharts, TanStack Query
│   ├── index.html
│   ├── vite.config.ts          # Dev proxy, manual chunks
│   ├── tailwind.config.ts
│   ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│   ├── eslint.config.js
│   ├── components.json         # shadcn/ui config
│   ├── dist/                   # BUILD ARTIFACTS (should not be in repo)
│   ├── public/                 # Static assets (favicon, placeholder, robots.txt)
│   │
│   │   ### GIT INTERNALS (SHOULD NOT EXIST) ###
│   ├── HEAD                    # git internal
│   ├── config                  # git internal
│   ├── description             # git internal
│   ├── hooks/                  # git hooks samples
│   ├── index                   # git index
│   ├── info/exclude            # git internal
│   ├── logs/                   # git logs
│   ├── objects/                # git objects (pack files)
│   ├── packed-refs             # git internal
│   ├── refs/                   # git refs
│   │   ### END GIT INTERNALS ###
│   │
│   └── src/
│       ├── App.tsx             # Router, QueryClient, lazy loading
│       ├── main.tsx            # Entry point
│       ├── index.css           # Tailwind + custom design tokens (dark theme)
│       ├── App.css
│       ├── vite-env.d.ts
│       ├── components/
│       │   ├── AnimatedBackground.tsx
│       │   ├── GenreChart.tsx
│       │   ├── Header.tsx
│       │   ├── HistoryList.tsx
│       │   ├── ListeningChart.tsx
│       │   ├── NavLink.tsx
│       │   ├── RecentlyPlayed.tsx
│       │   ├── StatisticsGrid.tsx
│       │   ├── StatsCard.tsx
│       │   ├── TimeRangeFilter.tsx
│       │   ├── TopArtistCard.tsx
│       │   ├── TopItemsLayout.tsx
│       │   ├── TopTrackCard.tsx
│       │   └── ui/             # ~40 shadcn/ui components (auto-generated)
│       ├── hooks/
│       │   ├── useSpotifyData.ts  # All API hooks (React Query)
│       │   ├── useHistoryStats.ts # History statistics hook
│       │   ├── useSettings.ts     # Local settings (localStorage)
│       │   ├── use-mobile.tsx     # Mobile detection
│       │   └── use-toast.ts       # Toast hook
│       ├── layouts/
│       │   └── MainLayout.tsx
│       ├── lib/
│       │   ├── api.ts          # Axios client + interceptors + CSRF (FIXED 2026-04-06)
│       │   ├── genreUtils.ts   # Genre normalization
│       │   ├── listeningAge.ts # Listening age calculation
│       │   ├── mockData.ts     # Preview mode mock data
│       │   ├── pluralize.ts    # Polish pluralization
│       │   └── utils.ts        # cn() utility
│       ├── pages/
│       │   ├── Index.tsx       # Dashboard
│       │   ├── Login.tsx       # Spotify OAuth login
│       │   ├── Callback.tsx    # OAuth callback handler
│       │   ├── TopArtists.tsx
│       │   ├── TopTracks.tsx
│       │   ├── History.tsx     # Listening history + badges
│       │   ├── Profile.tsx     # User profile
│       │   └── NotFound.tsx
│       └── styles/
│           └── utilities-backup.css
│
├── docs/                       # Security documentation
│   ├── INCIDENT_RESPONSE.md
│   ├── SECRETS_MANAGEMENT.md
│   └── SECURITY_TRAINING.md
├── scripts/security/           # Security audit scripts
│   ├── check_history.sh
│   ├── scan_secrets.sh
│   ├── security_audit.sh
│   └── validate_env.sh
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── GCP_DEPLOYMENT.md
├── UI_DESIGN_SYSTEM.md
└── ui_changes.patch            # Leftover patch file
```

## Entry Points

| Entry Point | Plik | Opis |
|------------|------|------|
| Backend start | `backend/src/server.js` | Express server na porcie 5000 |
| Frontend dev | `frontend/src/main.tsx` | Vite dev server na porcie 8080 |
| Frontend prod | `frontend/nginx.conf` | Nginx serwuje SPA z `dist/` |
| CI/CD deploy | `.github/workflows/deploy.yml` | Push to main -> Cloud Run |
| Cron sync | `POST /api/v1/cron/sync-listening-history` | GCP Cloud Scheduler co 6h |

## Krytyczne Flow Uzytkownika

1. **Login:** Login.tsx -> `/auth/login` -> Spotify OAuth -> `/auth/callback` -> JWT cookie + URL param -> Callback.tsx -> Dashboard
2. **View stats:** Dashboard (Index.tsx) -> `useSpotifyData` hooks -> axios -> `/api/v1/stats/*` -> Spotify API (cached 24h)
3. **Import history:** Upload JSON -> `/api/v1/import/upload` -> processStreamingHistory -> AggregatedStats + StreamingHistory
4. **Background sync:** Cloud Scheduler -> `/api/v1/cron/sync-listening-history` -> collectForAllActiveUsers

## Problemy Architektoniczne

| ID | Problem | Severity | Lokalizacja |
|----|---------|----------|-------------|
| ARCH-001 | ~~Git internals w `frontend/`~~ | ✅ FIXED | .gitignore updated (2026-04-06) |
| ARCH-002 | ~~Build artifacts (`frontend/dist/`) w repo~~ | ✅ FIXED | .gitignore updated (2026-04-06) |
| ARCH-003 | Placeholder profileController.js (pusty) | Low | backend/src/controllers/profileController.js |
| ARCH-004 | ~~Brakujacy `rbac.js` middleware (referencja w testach)~~ | ✅ FIXED | Testy RBAC usuniete (2026-04-06) |
| ARCH-005 | ~~Stale testy referencujace usuniety middleware~~ | ✅ FIXED | CSRF test updated, route paths fixed (2026-04-06) |
| ARCH-006 | `prom-client` i `@sentry/node` w kodzie ale nie w dependencies | Low | backend/src/middleware/metrics.js, sentry.js |
| ARCH-007 | Leftover `ui_changes.patch` w root | Low | ui_changes.patch |
| ARCH-008 | `bun.lockb` w frontend obok `package-lock.json` | Low | frontend/bun.lockb |
| ARCH-009 | `frontend/.env.preview` tracked w repo | Low | frontend/.env.preview |
| ARCH-010 | Niespojne wersje zod: backend v4, frontend v3 | Low | package.json |
