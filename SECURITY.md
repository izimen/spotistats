# Security Policy

## ✅ Supported Versions

Only the latest major version receives active security updates.

| Version | Supported          | Security Updates |
| ------- | ------------------ | ---------------- |
| 1.x     | :white_check_mark: | Active           |
| < 1.0   | :x:                | End of Life      |

## 🐛 Reporting a Vulnerability

We take the security of `spotistats` seriously. If you have found a vulnerability, please **do not** open a public issue.

### Private Disclosure Process
1.  **Email**: Send details to the maintainer via GitHub email (check profile) or open a **Security Advisory** in the repository if enabled.
2.  **Response**: We will acknowledge receipt within 48 hours.
3.  **Resolution**: We will provide a timeline for the fix and coordinate the release.

### Scope
- **In Scope**: Source code, authentication flows (OAuth/JWT), data protection features, API endpoints.
- **Out of Scope**: DDoS attacks, social engineering, issues in 3rd party dependencies (unless strictly pinned and unpatchable).

## 🔐 Security Features Implemented

### Authentication & Authorization
- **OAuth 2.0 + PKCE**: Stateless authentication with Spotify
- **JWT Rotation**: Access tokens stored in `HttpOnly` cookies, refresh tokens encrypted (AES-256-GCM) in DB
- **Separate Encryption Key**: Encryption uses a dedicated `ENCRYPTION_KEY`, decoupled from `JWT_SECRET`

### Protection Mechanisms
- **CSRF**: Double Submit Cookie pattern with cryptographically secure tokens
- **Content Security Policy (CSP)**: Strict policy blocking unsafe inline scripts and limiting external resources
- **Rate Limiting**: Adaptive limiting per user/IP to prevent Brute Force and DDoS
- **Cron Authentication**: Bearer token secret — spoofable `X-Cloudscheduler` header removed
- **Error Handling**: Internal error details hidden in production (RFC 7807 Problem Details format)
- **CORS**: Localhost origins restricted to development mode only
- **Proxy Trust**: `trust proxy: 1` — prevents IP spoofing via nested proxies

### Data Privacy (GDPR)
- **Data Export**: Users can export all their stored data
- **Right to be Forgotten**: Complete account deletion cascades to all related data
- **Minimal Collection**: Only necessary Spotify data is cached

---

## 🛡️ Security Audit — Fixes Applied (2026-02-20 → 2026-02-23)

A comprehensive code audit was performed file-by-file. The following 15 fixes were implemented:

### Critical Fixes (Security)
| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | JWT token leaked in URL redirect | `authController.js` | Token now set via HttpOnly cookie only |
| 2 | CSRF bypass via X-Requested-With fallback | `csrf.js` | Fallback removed, strict token check |
| 5 | Encryption key = JWT_SECRET | `encryptionService.js` | Separate `ENCRYPTION_KEY` env variable |
| 6 | Spoofable X-Cloudscheduler header | `cronAuth.js` | Header check removed, Bearer secret only |
| 8 | Error messages leaked in production | `errorHandler.js` | Non-operational errors return generic message |

### Performance Fixes
| # | Issue | File | Fix |
|---|-------|------|-----|
| 3 | N+1 upsert (50k queries) | `importService.js` | Replaced with bulk `INSERT...ON CONFLICT` |
| 4 | Full-table SELECT in memory | `listeningHistoryService.js` | Replaced with SQL `GROUP BY` aggregation |

### Architecture & Frontend Fixes
| # | Issue | File | Fix |
|---|-------|------|-----|
| 7 | Route conflict `/:id` vs `/stats` | `import.routes.js` | `/stats` now declared before `/:id` |
| 9 | Hardcoded localhost in CORS | `app.js` | Localhost only in `!isProduction` |
| 10 | `trust proxy: true` (spoofable) | `app.js` | Changed to `trust proxy: 1` |
| 11 | Conditional hooks (Rules of Hooks) | `useSpotifyData.ts` | Preview mode moved inside `queryFn` |
| 12 | Fake "vs yesterday" metric (+18%) | `useHistoryStats.ts` | Removed — returns 0 until real data available |
| 13 | Raw `fetch()` bypassing interceptors | `History.tsx` | Replaced with `api.get()` (4 locations) |
| 14 | Race condition in refresh subscribers | `api.ts` | Subscribers copied and cleared before notify |
| 15 | Duplicate `/api/*` route registrations | `app.js` | Removed — only `/api/v1/*` routes remain |

### Additional Cleanup
- Deleted dead code: `rbac.js` (148 lines, no imports)
- Updated all frontend API paths from `/api/` to `/api/v1/`
- Removed `X-Requested-With` from CORS allowed headers
- Updated tests to use `X-CSRF-Token`

---

## ⚠️ Known Limitations

The following items from the audit are **not yet resolved** and are tracked for future work:

- **Circuit breaker state is in-process memory** — does not work across multiple instances. Should be migrated to Redis for multi-process deployments
- **Import uses in-memory storage** (`multer memoryStorage`, 200MB limit) — risk of OOM with concurrent uploads. Consider streaming JSON parser
- **No integration tests** with a real database — only unit tests with mocks exist
- **No frontend tests** — Vitest + Testing Library setup pending
- **Audit logs go to stdout** — not to a persistent, tamper-proof store
- **Prediction confidence formula** is simplified (always 60-85%) — not a calibrated ML model
- **statsController.js is a God Controller** (~700 lines) — should be split into smaller modules
