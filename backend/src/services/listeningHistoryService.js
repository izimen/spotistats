/**
 * Listening History Service
 * Collects and manages listening history from Spotify API
 * Overcomes the 50-track limit by storing plays persistently
 */

const prisma = require('../utils/prismaClient');
const { Prisma } = require('@prisma/client');
const spotifyService = require('./spotifyService');
const env = require('../config/env');
const tokenService = require('./tokenService');

// playedAt is a UTC TIMESTAMP without zone - convert to local time before taking hour/weekday,
// otherwise "peak hours" are shifted by 1-2h for Polish users.
const localPlayedAt = () => Prisma.sql`("playedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${env.appTimezone})`;

const RECENTLY_PLAYED_LIMIT = 50;

/**
 * Recompute the estimated msPlayed of API rows from `from` onwards.
 * Spotify's played_at is the END of playback (verified on production data), so the time
 * actually listened is at most the gap to the previous play: min(durationMs, gap).
 * The previous play may already be in the DB - the window starts one row before `from`.
 * Only API rows count as "previous": an overlapping GDPR import holds the same plays ~1 s
 * apart and would zero them. No previous play -> full duration.
 */
async function recomputeMsPlayed(userId, from) {
    return prisma.$executeRaw`
        WITH win AS (
            SELECT "id", "source", "durationMs", "playedAt",
                   EXTRACT(EPOCH FROM ("playedAt" - LAG("playedAt") OVER (ORDER BY "playedAt"))) * 1000 AS gap_ms
            FROM "StreamingHistory"
            WHERE "userId" = ${userId} AND "source" = 'API'
              AND "playedAt" >= COALESCE(
                  (SELECT MAX("playedAt") FROM "StreamingHistory"
                   WHERE "userId" = ${userId} AND "source" = 'API' AND "playedAt" < ${from}),
                  ${from})
        )
        UPDATE "StreamingHistory" s
        SET "msPlayed" = CASE
                WHEN win.gap_ms IS NULL THEN win."durationMs"
                ELSE LEAST(win."durationMs", GREATEST(0, win.gap_ms))::int
            END
        FROM win
        WHERE s."id" = win."id" AND win."source" = 'API' AND win."durationMs" IS NOT NULL
          AND win."playedAt" >= ${from}
    `;
}

/**
 * Store recently-played items (throws on failure).
 * - skipDuplicates (ON CONFLICT DO NOTHING) - offline plays arriving late are fine
 * - gap detection: a full page of 50 plays all newer than the latest stored play means
 *   plays between the two syncs were lost
 * - msPlayed estimated from the gap to the previous play
 *
 * @returns {Promise<{collected: number, skipped: number, gapDetected: boolean}>}
 */
async function storeRecentPlays(userId, items) {
    if (!items || items.length === 0) {
        return { collected: 0, skipped: 0, gapDetected: false };
    }

    const historyEntries = items.map(item => ({
        userId,
        trackId: item.track?.id || null,
        trackName: item.track?.name || 'Unknown',
        artistName: item.track?.artists?.[0]?.name || 'Unknown',
        albumName: item.track?.album?.name || null,
        albumImage: item.track?.album?.images?.[2]?.url || item.track?.album?.images?.[1]?.url || item.track?.album?.images?.[0]?.url || null,
        spotifyUri: item.track?.uri || null,
        msPlayed: item.track?.duration_ms || 0, // replaced by the estimate below
        durationMs: item.track?.duration_ms || 0,
        playedAt: new Date(item.played_at),
        source: 'API',
        platform: 'spotify-api',
    }));

    const oldest = historyEntries.reduce((min, e) => (e.playedAt < min ? e.playedAt : min), historyEntries[0].playedAt);

    const latestStored = await prisma.streamingHistory.findFirst({
        where: { userId, source: 'API' },
        orderBy: { playedAt: 'desc' },
        select: { playedAt: true },
    });
    const gapDetected = Boolean(
        latestStored && items.length >= RECENTLY_PLAYED_LIMIT && oldest > latestStored.playedAt
    );

    const { count: collected } = await prisma.streamingHistory.createMany({
        data: historyEntries,
        skipDuplicates: true,
    });

    if (collected > 0) {
        await recomputeMsPlayed(userId, oldest);
    }

    if (gapDetected) {
        await prisma.user.update({ where: { id: userId }, data: { lastGapDetectedAt: new Date() } });
        console.warn(JSON.stringify({
            severity: 'WARNING',
            message: 'sync_gap_detected',
            component: 'spotify-sync',
            userId: userId.substring(0, 8),
            lastStored: latestStored.playedAt.toISOString(),
            oldestFetched: oldest.toISOString(),
        }));
    }

    const skipped = items.length - collected;
    console.log(`[ListeningHistory] User ${userId.substring(0, 8)}: collected=${collected}, skipped=${skipped}`);
    return { collected, skipped, gapDetected };
}

/**
 * Collect recent plays from Spotify API and save to database (never throws -
 * for fire-and-forget use, e.g. GET /stats/recent).
 *
 * @param {string} userId - User ID
 * @param {string} accessToken - Spotify access token
 * @param {Array} [prefetchedItems] - recently-played items already fetched by the caller
 * @returns {Promise<{collected: number, skipped: number, gapDetected?: boolean, error?: string}>}
 */
async function collectFromAPI(userId, accessToken, prefetchedItems) {
    try {
        const items = prefetchedItems
            || (await spotifyService.getRecentlyPlayed(accessToken, { limit: RECENTLY_PLAYED_LIMIT })).body?.items
            || [];
        return await storeRecentPlays(userId, items);
    } catch (error) {
        console.error('[ListeningHistory] Collection failed:', error.message);
        return { collected: 0, skipped: 0, error: error.message };
    }
}

/**
 * Get user's listening history with pagination
 *
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @param {Date} options.from - Start date
 * @param {Date} options.to - End date
 * @param {number} options.limit - Max records to return
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<{plays: Array, total: number, hasMore: boolean}>}
 */
async function getUserHistory(userId, options = {}) {
    const { from, to, limit = 50, offset = 0 } = options;
    const startTime = Date.now();

    const where = { userId };

    if (from || to) {
        where.playedAt = {};
        if (from) where.playedAt.gte = from;
        if (to) where.playedAt.lte = to;
    }

    try {
        // Run all queries in parallel for performance
        const [plays, total, aggregate, mostLoopedResult, allPlaysForHours, uniqueTracksResult] = await Promise.all([
            // Paginated plays for display
            prisma.streamingHistory.findMany({
                where,
                orderBy: { playedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            // Total count
            prisma.streamingHistory.count({ where }),
            // Total time aggregation
            prisma.streamingHistory.aggregate({
                where,
                _sum: { msPlayed: true }
            }),
            // Most looped track. Grouped by track+artist only (grouping by albumImage split
            // the same song into API rows with a cover and IMPORT rows without one).
            prisma.$queryRaw`
                SELECT "trackName", "artistName", MAX("albumImage") as "albumImage", COUNT(*)::int as count
                FROM "StreamingHistory"
                WHERE "userId" = ${userId}
                ${from ? Prisma.sql`AND "playedAt" >= ${from}` : Prisma.empty}
                ${to ? Prisma.sql`AND "playedAt" <= ${to}` : Prisma.empty}
                GROUP BY "trackName", "artistName"
                ORDER BY count DESC
                LIMIT 1
            `,
            // PERFORMANCE FIX: Aggregate hours in SQL instead of loading all records into memory
            prisma.$queryRaw`
                SELECT EXTRACT(HOUR FROM ${localPlayedAt()})::int as hour, COUNT(*)::int as count
                FROM "StreamingHistory"
                WHERE "userId" = ${userId}
                ${from ? Prisma.sql`AND "playedAt" >= ${from}` : Prisma.empty}
                ${to ? Prisma.sql`AND "playedAt" <= ${to}` : Prisma.empty}
                GROUP BY hour ORDER BY hour
            `,
            // Unique tracks count - COUNT(DISTINCT) in SQL instead of loading every group into memory
            prisma.$queryRaw`
                SELECT COUNT(*)::int as count FROM (
                    SELECT 1 FROM "StreamingHistory"
                    WHERE "userId" = ${userId}
                    ${from ? Prisma.sql`AND "playedAt" >= ${from}` : Prisma.empty}
                    ${to ? Prisma.sql`AND "playedAt" <= ${to}` : Prisma.empty}
                    GROUP BY "trackName", "artistName"
                ) t
            `
        ]);

        const uniqueTracks = uniqueTracksResult[0]?.count || 0;

        // Build hourCounts from SQL result
        const hourCounts = {};
        for (let i = 0; i < 24; i++) hourCounts[i] = 0;
        allPlaysForHours.forEach(row => {
            hourCounts[row.hour] = row.count;
        });

        // Get top 3 hours sorted by count
        const topHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Log slow queries
        const duration = Date.now() - startTime;
        if (duration > 1000) {
            console.warn(`[ListeningHistory] Slow query: getUserHistory took ${duration}ms`, { userId, from, to, total });
        }

        return {
            plays,
            total,
            totalTimeMs: Number(aggregate._sum.msPlayed || 0),
            hasMore: offset + plays.length < total,
            stats: {
                mostLooped: mostLoopedResult[0] ? {
                    trackName: mostLoopedResult[0].trackName,
                    artistName: mostLoopedResult[0].artistName,
                    albumImage: mostLoopedResult[0].albumImage,
                    count: mostLoopedResult[0].count
                } : null,
                topHours,
                // Full 24h distribution for the selected range (local time) - lets the
                // frontend draw the heatmap from all plays, not just the loaded page
                hourCounts: Object.values(hourCounts),
                uniqueTracks,
                repeatRatio: total > 0 ? 1 - (uniqueTracks / total) : 0
            }
        };
    } catch (error) {
        console.error('[ListeningHistory] Failed to fetch user history:', error.message);

        // Return minimal response on error - frontend will use fallback
        return {
            plays: [],
            total: 0,
            totalTimeMs: 0,
            hasMore: false,
            stats: null
        };
    }
}

/**
 * Get listening counts aggregated by day of week
 * Returns data optimized for the ListeningChart component
 *
 * @param {string} userId - User ID
 * @param {number} days - Number of days to look back (default 7)
 * @returns {Promise<Array<{day: string, count: number}>>}
 */
async function getListeningByDay(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // PERF-001: SQL aggregation instead of loading all records into memory
    // EXTRACT(DOW) returns 0=Sunday, 1=Monday, ..., 6=Saturday (same as JS getDay())
    const dayData = await prisma.$queryRaw`
        SELECT EXTRACT(DOW FROM ${localPlayedAt()})::int as dow, COUNT(*)::int as count
        FROM "StreamingHistory"
        WHERE "userId" = ${userId} AND "playedAt" >= ${startDate}
        GROUP BY dow ORDER BY dow
    `;

    // Build lookup from SQL results
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    dayData.forEach(row => { dayCounts[row.dow] = row.count; });

    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

    // Return in Monday-first order (matching ListeningChart)
    return [
        { day: dayNames[1], count: dayCounts[1] },
        { day: dayNames[2], count: dayCounts[2] },
        { day: dayNames[3], count: dayCounts[3] },
        { day: dayNames[4], count: dayCounts[4] },
        { day: dayNames[5], count: dayCounts[5] },
        { day: dayNames[6], count: dayCounts[6] },
        { day: dayNames[0], count: dayCounts[0] },
    ];
}

/**
 * Get listening counts aggregated by hour of day (0-23)
 * Helps identify "Peak Hours" (Złote Godziny)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array<{hour: number, count: number, intensity: number}>>}
 */
async function getListeningByHour(userId) {
    // PERFORMANCE FIX: Aggregate in SQL instead of loading all records into memory
    const hourData = await prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM ${localPlayedAt()})::int as hour, COUNT(*)::int as count
        FROM "StreamingHistory"
        WHERE "userId" = ${userId}
        GROUP BY hour ORDER BY hour
    `;

    if (hourData.length === 0) {
        return [];
    }

    // Initialize hours 0-23 and fill from query result
    const hours = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    hourData.forEach(row => { hours[row.hour] = row.count; });

    // Calculate max for intensity
    const maxCount = Math.max(...Object.values(hours), 1);

    // Format
    return Object.entries(hours).map(([h, count]) => ({
        hour: parseInt(h),
        count,
        intensity: parseFloat((count / maxCount).toFixed(2))
    })).sort((a, b) => a.hour - b.hour);
}

/**
 * Get collection statistics for a user
 * Useful for showing sync status in UI
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
async function getCollectionStats(userId) {
    const [totalPlays, apiPlays, importPlays, firstPlay, lastPlay] = await Promise.all([
        prisma.streamingHistory.count({ where: { userId } }),
        prisma.streamingHistory.count({ where: { userId, source: 'API' } }),
        prisma.streamingHistory.count({ where: { userId, source: 'IMPORT' } }),
        prisma.streamingHistory.findFirst({
            where: { userId },
            orderBy: { playedAt: 'asc' },
            select: { playedAt: true },
        }),
        prisma.streamingHistory.findFirst({
            where: { userId },
            orderBy: { playedAt: 'desc' },
            select: { playedAt: true },
        }),
    ]);

    return {
        totalPlays,
        apiPlays,
        importPlays,
        firstPlay: firstPlay?.playedAt || null,
        lastPlay: lastPlay?.playedAt || null,
        collectionActive: apiPlays > 0,
    };
}

// ============================================
// Cron Job Functions
// ============================================

const MAX_DURATION = 500000; // 500s timeout (Cloud Scheduler max is 540s)

/**
 * Helper: delay function for rate limiting
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Collect listening history for ALL active users
 * Called by GCP Cloud Scheduler endpoint
 *
 * Features:
 * - Timeout handling (stops before Cloud Scheduler limit)
 * - Rate limiting (1s delay between users)
 * - Structured JSON logging for GCP Cloud Logging
 * - High failure rate monitoring
 * - Revoked token cleanup
 *
 * @returns {Promise<{processed: number, failed: number, skipped: number, duration: number, details: Array}>}
 */
async function collectForAllActiveUsers() {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Cron collection started',
        timestamp,
        component: 'spotify-sync'
    }));

    // Users with a Spotify grant who didn't switch collection off
    const users = await prisma.user.findMany({
        where: { refreshToken: { not: null }, collectionEnabled: true },
        select: { id: true }
    });

    if (users.length === 0) {
        console.log(JSON.stringify({
            severity: 'INFO',
            message: 'No users with valid tokens found',
            timestamp,
            component: 'spotify-sync'
        }));
        return { processed: 0, failed: 0, skipped: 0, total: 0, quotaExceeded: false, duration: Date.now() - startTime, details: [] };
    }

    console.log(JSON.stringify({
        severity: 'INFO',
        message: `Found ${users.length} users to process`,
        timestamp,
        component: 'spotify-sync',
        userCount: users.length
    }));

    const results = {
        processed: 0,
        failed: 0,
        skipped: 0,
        total: users.length,
        quotaExceeded: false,
        details: []
    };

    for (let i = 0; i < users.length; i++) {
        // Timeout check - stop before Cloud Scheduler limit
        if (Date.now() - startTime > MAX_DURATION) {
            console.warn(JSON.stringify({
                severity: 'WARNING',
                message: 'Timeout approaching, stopping early',
                timestamp: new Date().toISOString(),
                component: 'spotify-sync',
                processedSoFar: results.processed,
                remaining: users.length - i
            }));
            results.skipped = users.length - results.processed - results.failed;
            break;
        }

        const user = users[i];
        // SEC-015: Log userId prefix instead of displayName for privacy
        const userLabel = user.id.substring(0, 8);
        const attemptAt = new Date();

        try {
            // 1. Valid access token (stored one reused; refresh persists rotated refresh token)
            const accessToken = await tokenService.getValidAccessToken(user.id);

            // 2. Fetch + store (throws on failure, so a failed sync is never counted as success)
            const response = await spotifyService.getRecentlyPlayed(accessToken, { limit: RECENTLY_PLAYED_LIMIT });
            const result = await storeRecentPlays(user.id, response.body?.items || []);

            // 3. Health: lastSyncAt only on success
            await prisma.user.update({
                where: { id: user.id },
                data: { lastSyncAt: attemptAt, lastSyncAttemptAt: attemptAt, lastSyncError: null, syncFailureCount: 0 }
            });

            results.processed++;
            results.details.push({
                userId: user.id,
                status: 'success',
                collected: result.collected,
                skipped: result.skipped,
                gapDetected: result.gapDetected
            });
        } catch (error) {
            results.failed++;
            const quota = tokenService.isQuotaOrRateLimit(error);
            const revoked = error.code === 'REFRESH_TOKEN_REVOKED' || error.code === 'NO_REFRESH_TOKEN';
            const reason = quota ? 'rate_limited' : revoked ? 'token_revoked' : error.message;

            console.error(JSON.stringify({
                severity: 'ERROR',
                message: 'User sync failed',
                timestamp: new Date().toISOString(),
                component: 'spotify-sync',
                userId: userLabel,
                reason,
                reasonDetail: error.body?.error?.reason || error.body?.error_description || undefined
            }));

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    lastSyncAttemptAt: attemptAt,
                    lastSyncError: String(reason).slice(0, 500),
                    syncFailureCount: { increment: 1 }
                }
            }).catch(() => { /* health bookkeeping must not mask the real error */ });

            results.details.push({ userId: user.id, status: 'failed', reason });

            // Quota is per developer account: every further call would fail too
            if (quota) {
                results.quotaExceeded = true;
                results.skipped = users.length - results.processed - results.failed;
                break;
            }
        }

        // Rate limiting: 1 second delay between users
        if (i < users.length - 1) {
            await delay(1000);
        }
    }

    const duration = Date.now() - startTime;

    // High failure rate warning (>20% failed)
    if (users.length > 0 && results.failed > users.length * 0.2) {
        console.error(JSON.stringify({
            severity: 'ERROR',
            message: 'HIGH FAILURE RATE',
            timestamp: new Date().toISOString(),
            component: 'spotify-sync',
            failRate: (results.failed / users.length * 100).toFixed(1) + '%',
            failed: results.failed,
            total: users.length
        }));
    }

    console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Cron collection completed',
        timestamp: new Date().toISOString(),
        component: 'spotify-sync',
        processed: results.processed,
        failed: results.failed,
        skipped: results.skipped,
        duration: `${duration}ms`
    }));

    return { ...results, duration };
}

module.exports = {
    collectFromAPI,
    storeRecentPlays,
    recomputeMsPlayed,
    getUserHistory,
    getListeningByDay,
    getListeningByHour,
    getCollectionStats,
    collectForAllActiveUsers,
};
