-- Enable RLS on Prisma migrations table
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_prisma_migrations" ON "_prisma_migrations" FOR ALL USING (true) WITH CHECK (true);
