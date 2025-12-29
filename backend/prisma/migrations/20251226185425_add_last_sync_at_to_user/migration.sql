-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_lastSyncAt_idx" ON "User"("lastSyncAt");
