-- AlterTable
ALTER TABLE "StreamingHistory" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'IMPORT',
ADD COLUMN     "trackId" TEXT;

-- CreateIndex
CREATE INDEX "StreamingHistory_userId_source_idx" ON "StreamingHistory"("userId", "source");
