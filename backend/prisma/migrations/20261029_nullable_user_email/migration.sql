-- Spotify stopped returning `email` from GET /me for development-mode apps (Feb 2026).
-- A unique index still allows multiple NULLs in PostgreSQL.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
