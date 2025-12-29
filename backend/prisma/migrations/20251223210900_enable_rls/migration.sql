-- Enable Row Level Security on all application tables
-- This migration adds RLS policies for production security

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

-- User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- StreamingHistory table
ALTER TABLE "StreamingHistory" ENABLE ROW LEVEL SECURITY;

-- Import table
ALTER TABLE "Import" ENABLE ROW LEVEL SECURITY;

-- Note: _prisma_migrations is a Prisma internal table
-- RLS is typically not needed there as it's only accessed by the migration tool
-- However, if your security advisor requires it:
-- ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- Since we use service-level authentication (backend JWT),
-- we allow all operations for the service role.
-- In a Supabase context, this means the service_role key
-- bypasses RLS, while anonymous users cannot access.
-- =====================================================

-- Policy: Service role can do everything on User table
CREATE POLICY "service_role_all_user" ON "User"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can do everything on StreamingHistory table
CREATE POLICY "service_role_all_streaming_history" ON "StreamingHistory"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can do everything on Import table
CREATE POLICY "service_role_all_import" ON "Import"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- DROP UNUSED INDEXES (if confirmed unused after analysis)
-- Note: Be careful with dropping indexes in production.
-- These are commented out - review before uncommenting.
-- =====================================================

-- The "unused index" warnings may be false positives if:
-- 1. The app was recently deployed
-- 2. Queries using these indexes haven't run yet
--
-- Prisma creates these indexes for foreign key performance.
-- Generally, keep them unless you have performance issues.
--
-- If you want to drop them after careful analysis:
-- DROP INDEX IF EXISTS "User_spotifyId_idx";
-- DROP INDEX IF EXISTS "User_email_idx";
-- DROP INDEX IF EXISTS "User_tokenFamily_idx";
-- DROP INDEX IF EXISTS "StreamingHistory_userId_playedAt_idx";
-- DROP INDEX IF EXISTS "StreamingHistory_userId_artistName_idx";
-- DROP INDEX IF EXISTS "StreamingHistory_userId_trackName_idx";
-- DROP INDEX IF EXISTS "Import_userId_status_idx";
