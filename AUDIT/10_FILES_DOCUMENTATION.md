# AUDIT: Files Documentation

## Backend Files

### Config & Environment
| Sciezka | Rola | Powiazania | Ryzyka | Rekomendacje |
|---------|------|-----------|--------|-------------|
| `backend/.env` | Zmienne srodowiskowe (LOCAL) | Caly backend | KRYTYCZNE: zawiera sekrety, bylo w git history | Zrotuj sekrety |
| `backend/.env.example` | Template dla .env | Deweloperzy | - | Dodaj ENCRYPTION_KEY |
| `backend/.env.development.example` | Dev config template | - | - | OK |
| `backend/.env.production.example` | Prod config template | - | - | OK |
| `backend/.gitignore` | Git ignore rules | Git | - | OK |
| `backend/.dockerignore` | Docker ignore rules | Docker build | - | OK |
| `backend/Dockerfile` | Docker build config | CI/CD | - | Dodaj NODE_OPTIONS |
| `backend/jest.config.js` | Test config | Tests | - | OK |
| `backend/package.json` | Dependencies | npm | Zod v4 (beta?) | Zweryfikuj kompatybilnosc |

### Prisma
| Sciezka | Rola | Powiazania | Ryzyka | Rekomendacje |
|---------|------|-----------|--------|-------------|
| `backend/prisma/schema.prisma` | Database schema | Caly backend | - | OK, dobrze zaprojektowany |
| `backend/prisma/migrations/` | 6 migracji | DB | - | OK |
| `backend/prisma/rls_prisma_migrations.sql` | Row Level Security | DB | Nie wiadomo czy zastosowany | Zweryfikuj |

### Source - Config
| Sciezka | Rola | Powiazania | Ryzyka | Rekomendacje |
|---------|------|-----------|--------|-------------|
| `backend/src/config/env.js` | Env validation | Caly backend | - | OK |
| `backend/src/config/spotify.js` | OAuth scopes | Auth flow | - | OK |

### Source - Controllers
| Sciezka | Rola | Powiazania | Ryzyka | Rekomendacje |
|---------|------|-----------|--------|-------------|
| `backend/src/controllers/authController.js` | OAuth flow, JWT | Auth routes | JWT w URL (SEC-003 pending), access token w JWT (SEC-004 pending), ✅ SEC-019 FIXED | Napraw SEC-003/004 |
| `backend/src/controllers/statsController.js` | Stats endpoints | Stats routes | Podwojny DB query, encoding issues | Napraw |
| `backend/src/controllers/importController.js` | History import | Import routes | - | OK |
| `backend/src/controllers/cronController.js` | Cron jobs | Cron routes | - | OK |
| `backend/src/controllers/profileController.js` | **PUSTY PLACEHOLDER** | Profile routes | Dead code | Usun lub implementuj |

### Source - Middleware
| Sciezka | Rola | Powiazania | Ryzyka | Rekomendacje |
|---------|------|-----------|--------|-------------|
| `backend/src/middleware/protect.js` | JWT auth | All protected routes | ✅ FIXED: select clause, refreshToken stripped | OK |
| `backend/src/middleware/csrf.js` | CSRF protection | POST/PUT/DELETE | ✅ FIXED: frontend wysyla token | OK |
| `backend/src/middleware/cronAuth.js` | Cron auth | Cron routes | Dev bypass | OK (dev only) |
| `backend/src/middleware/errorHandler.js` | Error handling | All routes | Stack leak w dev | OK |
| `backend/src/middleware/rateLimiter.js` | Rate limiting | All routes | Memory-only bez Redis | Dodaj Redis |
| `backend/src/middleware/metrics.js` | **STUB** (prom-client not installed) | - | - | Zainstaluj lub usun |
| `backend/src/middleware/sentry.js` | **STUB** (@sentry/node not installed) | - | - | Zainstaluj lub usun |

### Source - Services
| Sciezka | Rola | Powiazania | Ryzyka | Rekomendacje |
|---------|------|-----------|--------|-------------|
| `backend/src/services/spotifyService.js` | Spotify API + cache + circuit breaker | Controllers | Global circuit breaker state | OK na obecna skale |
| `backend/src/services/encryptionService.js` | AES-256-GCM | Auth, tokens | - | OK |
| `backend/src/services/pkceService.js` | PKCE state | Auth | - | OK |
| `backend/src/services/importService.js` | History import | Import controller | ✅ SQL injection FIXED, full-memory parse (pending) | OK (security), optymalizuj (memory) |
| `backend/src/services/listeningHistoryService.js` | History collection | Stats, cron | getListeningByDay memory issue | Optymalizuj |
| `backend/src/services/musicDNAService.js` | Audio features | Stats | - | OK |
| `backend/src/services/predictionService.js` | Listening prediction | Stats | - | OK |
| `backend/src/services/discoveryService.js` | Music recommendations | Stats | - | OK |
| `backend/src/services/auditService.js` | Audit logging | Import routes | Console-only (no persistent storage) | OK na start |

### Tests
| Sciezka | Rola | Powiazania | Ryzyka | Rekomendacje |
|---------|------|-----------|--------|-------------|
| `backend/tests/setup.js` | Test env setup | All tests | - | OK |
| `backend/tests/auth.test.js` | Auth flow tests | Auth | - | OK |
| `backend/tests/business.test.js` | Business logic tests | Import, stats | Shallow mock tests | Poglebic |
| `backend/tests/security.test.js` | Security tests | Security | ✅ FIXED: RBAC testy usuniete, CSRF -> Double Submit Cookie, route paths fixed | OK |

---

## Frontend Files

### Config
| Sciezka | Rola | Ryzyka | Rekomendacje |
|---------|------|--------|-------------|
| `frontend/.env` | Dev API URL (LOCAL) | - | OK |
| `frontend/.env.preview` | Preview mode config | Tracked w repo | OK |
| `frontend/vite.config.ts` | Vite config | - | OK |
| `frontend/tailwind.config.ts` | Tailwind config | - | OK |
| `frontend/tsconfig.json` | TypeScript config | - | OK |
| `frontend/eslint.config.js` | ESLint config | - | OK |
| `frontend/nginx.conf` | Production nginx | Brakujace security headers na static | Napraw |
| `frontend/Dockerfile` | Docker build | COPY . . kopiuje smieci | Napraw .dockerignore |
| `frontend/bun.lockb` | Bun lockfile | Konflikt z package-lock.json | Usun jeden |
| `frontend/package.json` | Dependencies | Zod v3 (vs backend v4) | Zjednocz |

### Dead/Junk Files w frontend/
| Sciezka | Rola | Rekomendacja | Status |
|---------|------|-------------|--------|
| `frontend/HEAD` | Git internal | **USUN** | ✅ .gitignore |
| `frontend/config` | Git internal | **USUN** | ✅ .gitignore |
| `frontend/description` | Git internal | **USUN** | ✅ .gitignore |
| `frontend/hooks/*.sample` | Git hook samples | **USUN** | ✅ .gitignore |
| `frontend/index` | Git index | **USUN** | ✅ .gitignore |
| `frontend/info/exclude` | Git internal | **USUN** | ✅ .gitignore |
| `frontend/logs/` | Git logs | **USUN** | ✅ .gitignore |
| `frontend/objects/` | Git objects (pack) | **USUN** | ✅ .gitignore |
| `frontend/packed-refs` | Git internal | **USUN** | ✅ .gitignore |
| `frontend/refs/` | Git refs | **USUN** | ✅ .gitignore |
| `frontend/dist/` | Build artifacts | **USUN**, dodaj do .gitignore | ✅ .gitignore |
| `frontend/src/styles/utilities-backup.css` | Backup CSS | ✅ USUNIETY | ✅ DONE |

### Root Files
| Sciezka | Rola | Ryzyka | Rekomendacje |
|---------|------|--------|-------------|
| `README.md` | Project documentation | - | OK |
| `CONTRIBUTING.md` | Contributor guide | - | OK |
| `SECURITY.md` | Security policy | - | OK |
| `GCP_DEPLOYMENT.md` | Deploy guide | - | OK |
| `UI_DESIGN_SYSTEM.md` | Design system docs | - | OK |
| `ui_changes.patch` | Leftover patch file | Zbedny | **USUN** |
| `.pre-commit-config.yaml` | Pre-commit hooks | - | OK |
| `.github/workflows/deploy.yml` | Deploy pipeline | Brak testow, brak smoke test | Napraw |
| `.github/workflows/security-scan.yml` | Security scanning | continue-on-error | Napraw |
| `docs/INCIDENT_RESPONSE.md` | IR plan | - | OK |
| `docs/SECRETS_MANAGEMENT.md` | Secrets policy | - | OK |
| `docs/SECURITY_TRAINING.md` | Security training | - | OK |
| `scripts/security/` | Security audit scripts | - | OK |
