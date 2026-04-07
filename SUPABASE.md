# SpotiStats — Supabase Database Summary

## Connection

| Property | Value |
|---|---|
| **Project URL** | `https://fcidlslrrzgpahtbtrrw.supabase.co` |
| **PostgreSQL** | 17.6 (aarch64-unknown-linux-gnu) |
| **Database** | `postgres` |
| **Size** | 14 MB |
| **ORM** | Prisma 5 (`DATABASE_URL` + `DIRECT_URL`) |
| **Access** | Backend connects via Prisma; Supabase dashboard/MCP via `service_role` |

Backend uses two connection strings:
- `DATABASE_URL` — Supabase connection pooler (PgBouncer, port 6543) for runtime queries
- `DIRECT_URL` — direct Postgres connection (port 5432) for Prisma migrations

---

## Schema (`public`)

### User
Central user table. One record per Spotify account.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` (cuid) | PK |
| `spotifyId` | `text` | Unique, indexed |
| `email` | `text` | Unique, indexed |
| `displayName` | `text?` | |
| `avatarUrl` | `text?` | |
| `country` | `text?` | |
| `product` | `text?` | Spotify plan (free/premium) |
| `refreshToken` | `text?` | AES-256-GCM encrypted |
| `spotifyAccessToken` | `text?` | AES-256-GCM encrypted (SEC-004) |
| `spotifyAccessTokenExpiry` | `timestamp?` | |
| `tokenExpiry` | `timestamp?` | Refresh token expiry |
| `tokenFamily` | `text?` | Rotation detection, indexed |
| `tokenVersion` | `int` (default 0) | Increment to invalidate all JWTs |
| `authCode` | `text?` | Unique; SEC-003 short-lived exchange code |
| `authCodeExpiry` | `timestamp?` | |
| `lastSyncAt` | `timestamp?` | Last cron sync, indexed |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

**Relations:** StreamingHistory, Import, cached_top_items, aggregated_stats (all cascade delete)

### StreamingHistory
Listening history — from Spotify GDPR export imports and live API collection.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` (cuid) | PK |
| `userId` | `text` | FK -> User |
| `trackId` | `text?` | Spotify track ID (API-sourced) |
| `trackName` | `text` | CHECK: not empty |
| `artistName` | `text` | CHECK: not empty |
| `albumName` | `text?` | |
| `albumImage` | `text?` | Cover URL |
| `spotifyUri` | `text?` | `spotify:track:xxx` |
| `msPlayed` | `int` | CHECK: > 0 |
| `playedAt` | `timestamp` | |
| `source` | `text` (default `IMPORT`) | `IMPORT` or `API` |
| `platform` | `text?` | |
| `country` | `text?` | |
| `createdAt` | `timestamp` | |

**Unique constraint:** `(userId, trackName, artistName, playedAt)` — deduplication
**Indexes:** `(userId, playedAt)`, `(userId, source)`, `(userId, artistName)`, `(userId, trackName)`
**Current:** 2,846 rows, 1,768 kB total (880 kB data + 848 kB indexes)

### cached_top_items
Cached Spotify API responses for top artists/tracks (24h TTL managed by backend).

| Column | Type | Notes |
|---|---|---|
| `id` | `text` (cuid) | PK |
| `userId` | `text` | FK -> User |
| `type` | `text` | `artists`, `tracks`, `albums` |
| `term` | `text` | `short_term`, `medium_term`, `long_term` |
| `data` | `jsonb` | Full Spotify API response |
| `updatedAt` | `timestamp` | TTL check against this |

**Unique constraint:** `(userId, type, term)`
**Current:** 31 rows, 984 kB total (mostly JSONB data in TOAST)

### aggregated_stats
Pre-computed per-track aggregates from streaming history.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` (cuid) | PK |
| `userId` | `text` | FK -> User |
| `trackUri` | `text` | `spotify:track:xxx` |
| `artistName` | `text` | |
| `trackName` | `text` | |
| `albumName` | `text?` | |
| `playCount` | `int` (default 0) | |
| `totalMsPlayed` | `bigint` (default 0) | |
| `firstPlayed` | `timestamp?` | |
| `lastPlayed` | `timestamp?` | |

**Unique constraint:** `(userId, trackUri)`
**Indexes:** `(userId, playCount)`, `(userId, lastPlayed)`
**Current:** 0 rows (not yet populated)

### Import
Tracks file import jobs (Spotify GDPR data exports).

| Column | Type | Notes |
|---|---|---|
| `id` | `text` (cuid) | PK |
| `userId` | `text` | FK -> User |
| `fileName` | `text` | |
| `fileSize` | `int` | Bytes |
| `status` | `ImportStatus` enum | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `totalTracks` | `int` (default 0) | |
| `imported` | `int` (default 0) | |
| `skipped` | `int` (default 0) | |
| `duplicates` | `int` (default 0) | |
| `errors` | `int` (default 0) | |
| `errorMessage` | `text?` | |
| `startedAt` | `timestamp?` | |
| `completedAt` | `timestamp?` | |
| `createdAt` | `timestamp` | |

**Indexes:** `(userId, status)`
**Current:** 0 rows

---

## Relationships (ERD)

```
User (1) ──< StreamingHistory (N)    [userId FK, cascade delete]
User (1) ──< Import (N)              [userId FK, cascade delete]
User (1) ──< cached_top_items (N)    [userId FK, cascade delete]
User (1) ──< aggregated_stats (N)    [userId FK, cascade delete]
```

All child tables reference `User.id` with `ON DELETE CASCADE` — deleting a user removes all their data.

---

## Security

### Row Level Security (RLS)
RLS is **enabled on all 6 tables** (including `_prisma_migrations`).

Every table has the same policy pattern:

```sql
-- Only service_role or postgres superuser can access
CREATE POLICY "service_role_all_<table>" ON "<table>"
  FOR ALL
  TO service_role
  USING (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR CURRENT_USER = 'postgres'
  )
  WITH CHECK (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR CURRENT_USER = 'postgres'
  );
```

**Result:** `anon` and `authenticated` Supabase roles have **zero access**. All data access goes through the backend API (Prisma connects as `postgres` role via `DATABASE_URL`). The Supabase PostgREST/JS client is effectively locked out — this is intentional since auth is handled by the backend, not Supabase Auth.

### Data Integrity Constraints
- `User.spotifyId` — CHECK: not empty
- `User.email` — CHECK: not empty
- `StreamingHistory.trackName` — CHECK: not empty
- `StreamingHistory.artistName` — CHECK: not empty
- `StreamingHistory.msPlayed` — CHECK: > 0

### Encryption
Sensitive tokens stored in `User` table are encrypted at the application level with AES-256-GCM before writing to the database:
- `refreshToken` — Spotify refresh token
- `spotifyAccessToken` — Spotify access token (SEC-004)

The `ENCRYPTION_KEY` is stored as a GCP Secret Manager secret, injected at runtime.

---

## Installed Extensions

| Extension | Schema | Version | Purpose |
|---|---|---|---|
| `plpgsql` | pg_catalog | 1.0 | PL/pgSQL procedural language (default) |
| `uuid-ossp` | extensions | 1.1 | UUID generation |
| `pgcrypto` | extensions | 1.3 | Cryptographic functions |
| `pg_stat_statements` | extensions | 1.11 | Query performance monitoring |
| `pg_graphql` | graphql | 1.5.11 | GraphQL support (Supabase built-in) |
| `supabase_vault` | vault | 0.3.1 | Secrets management (Supabase built-in) |

Only `pgcrypto` and `uuid-ossp` are actively relevant — the rest are Supabase defaults. The app does not use Supabase's GraphQL or Vault features.

---

## Migrations

### Prisma Migrations (schema changes)
Applied via `prisma migrate deploy` during CI/CD:

| Date | Migration | Description |
|---|---|---|
| 2025-12-23 | `init` | Initial schema: User, StreamingHistory, Import |
| 2025-12-23 | `phase2_cache_and_aggregation` | Added cached_top_items, aggregated_stats |
| 2025-12-23 | `enable_rls` | Enabled RLS on tables |
| 2025-12-26 | `add_listening_history_tracking` | Source tracking (API vs IMPORT) |
| 2025-12-26 | `add_last_sync_at_to_user` | `lastSyncAt` column for cron sync |
| 2025-12-28 | `add_album_image` | `albumImage` column on StreamingHistory |
| 2026-04-06 | `add_server_side_access_token` | SEC-004: `spotifyAccessToken`, `spotifyAccessTokenExpiry` |
| 2026-04-07 | `add_auth_code_columns` | SEC-003: `authCode`, `authCodeExpiry` |

### Supabase Migrations (security hardening)
Applied via Supabase dashboard/CLI:

| Date | Migration | Description |
|---|---|---|
| 2026-01-09 | `enable_rls_on_cache_tables` | RLS on cached_top_items, aggregated_stats |
| 2026-01-09 | `fix_permissive_rls_policies` | Tightened overly permissive policies |
| 2026-01-09 | `remove_unused_indexes` | Cleaned up redundant indexes |
| 2026-01-09 | `revoke_anon_authenticated_grants` | Revoked default Supabase role access |
| 2026-01-09 | `harden_rls_policies_service_role` | service_role-only policies |
| 2026-01-09 | `add_db_integrity_constraints` | CHECK constraints on critical columns |
| 2026-01-09 | `db_role_hardening` | Final role permission lockdown |

---

## Table Sizes

| Table | Total | Data | Indexes |
|---|---|---|---|
| StreamingHistory | 1,768 kB | 880 kB | 848 kB |
| cached_top_items | 984 kB | 8 kB | 48 kB |
| User | 144 kB | 8 kB | 96 kB |
| aggregated_stats | 40 kB | 0 B | 32 kB |
| _prisma_migrations | 32 kB | 8 kB | 16 kB |
| Import | 24 kB | 0 B | 16 kB |

---

## How It All Connects

```
                    ┌─────────────────┐
                    │   Frontend       │
                    │  (React/Vite)    │
                    └────────┬────────┘
                             │ HTTPS (JWT in cookie)
                             v
                    ┌─────────────────┐
                    │   Backend        │
                    │  (Express/Node)  │
                    │                  │
                    │  Prisma Client ──┼──> DATABASE_URL (pooler:6543)
                    │  Prisma Migrate ─┼──> DIRECT_URL  (direct:5432)
                    └────────┬────────┘
                             │
                             v
              ┌──────────────────────────────┐
              │     Supabase PostgreSQL       │
              │                              │
              │  ┌─────────┐  ┌───────────┐  │
              │  │  User    │──│ Streaming │  │
              │  │         │  │ History   │  │
              │  │         │──│ Import    │  │
              │  │         │──│ Cache     │  │
              │  │         │──│ AggStats  │  │
              │  └─────────┘  └───────────┘  │
              │                              │
              │  RLS: service_role only      │
              │  Encryption: app-level AES   │
              └──────────────────────────────┘
```

1. **Frontend** sends requests to backend with JWT (httpOnly cookie)
2. **Backend** validates JWT, extracts `userId`, queries Supabase via Prisma
3. **Prisma** connects as `postgres` role — passes RLS check
4. **RLS** blocks any direct Supabase client access (`anon`/`authenticated` roles denied)
5. **Tokens** (refresh + access) are AES-256-GCM encrypted before storage, decrypted at read time by backend
6. **Cron job** runs periodically to sync recently played tracks via Spotify API -> StreamingHistory
