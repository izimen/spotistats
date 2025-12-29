-- CreateTable
CREATE TABLE "cached_top_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cached_top_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregated_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackUri" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "albumName" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "totalMsPlayed" BIGINT NOT NULL DEFAULT 0,
    "firstPlayed" TIMESTAMP(3),
    "lastPlayed" TIMESTAMP(3),

    CONSTRAINT "aggregated_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cached_top_items_updatedAt_idx" ON "cached_top_items"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cached_top_items_userId_type_term_key" ON "cached_top_items"("userId", "type", "term");

-- CreateIndex
CREATE INDEX "aggregated_stats_userId_playCount_idx" ON "aggregated_stats"("userId", "playCount");

-- CreateIndex
CREATE INDEX "aggregated_stats_userId_lastPlayed_idx" ON "aggregated_stats"("userId", "lastPlayed");

-- CreateIndex
CREATE UNIQUE INDEX "aggregated_stats_userId_trackUri_key" ON "aggregated_stats"("userId", "trackUri");

-- AddForeignKey
ALTER TABLE "cached_top_items" ADD CONSTRAINT "cached_top_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregated_stats" ADD CONSTRAINT "aggregated_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
