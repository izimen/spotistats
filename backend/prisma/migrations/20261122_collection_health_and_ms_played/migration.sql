-- Background collection health (logout no longer stops collection)
ALTER TABLE "User" ADD COLUMN "collectionEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "spotifyGrantRevokedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastSyncAttemptAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastSyncError" TEXT;
ALTER TABLE "User" ADD COLUMN "syncFailureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastGapDetectedAt" TIMESTAMP(3);

-- Real listening time for API rows.
-- played_at from Spotify is the END of playback (verified on production data: gap between
-- consecutive plays equals the current track's duration), so the time actually listened is
-- at most the gap to the previous play. Only API rows feed the gap: an overlapping GDPR import
-- (same plays, ts ~1 s apart) must not zero the API rows until import dedup exists.
ALTER TABLE "StreamingHistory" ADD COLUMN "durationMs" INTEGER;

-- Re-runnable: never overwrite an already stored full length with an estimate
UPDATE "StreamingHistory" SET "durationMs" = "msPlayed" WHERE "source" = 'API' AND "durationMs" IS NULL;

WITH ordered AS (
    SELECT "id", "source", "durationMs",
           EXTRACT(EPOCH FROM ("playedAt" - LAG("playedAt") OVER (PARTITION BY "userId" ORDER BY "playedAt"))) * 1000 AS gap_ms
    FROM "StreamingHistory"
    WHERE "source" = 'API'
)
UPDATE "StreamingHistory" s
SET "msPlayed" = CASE
        WHEN o.gap_ms IS NULL THEN o."durationMs"
        ELSE LEAST(o."durationMs", GREATEST(0, o.gap_ms))::int
    END
FROM ordered o
WHERE s."id" = o."id" AND o."source" = 'API' AND o."durationMs" IS NOT NULL;
