/**
 * Listening History Service
 * Collects and manages listening history from Spotify API
 * Overcomes the 50-track limit by storing plays persistently
 */

const prisma = require('../utils/prismaClient');
const { Prisma } = require('@prisma/client');
const spotifyService = require('./spotifyService');

/**
 * Collect recent plays from Spotify API and save to database
 * Uses skipDuplicates to avoid inserting existing plays
 *
 * @param {string} userId - User ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<{collected: number, skipped: number, error?: string}>}
 */
async function collectFromAPI(userId, accessToken) {
    try {
        // Fetch last 50 plays from Spotify
        const result = await spotifyService.getRecentlyPlayed(accessToken, { limit: 50 });
        const items = result.body?.items || [];

        if (items.length === 0) {
            return { collected: 0, skipped: 0 };
        }

        // Transform Spotify data to our schema
        const historyEntries = items.map(item => ({
            userId,
            trackId: item.track?.id || null,
            trackName: item.track?.name || 'Unknown',
            artistName: item.track?.artists?.[0]?.name || 'Unknown',
            albumName: item.track?.album?.name || null,
            albumImage: item.track?.album?.images?.[2]?.url || item.track?.album?.images?.[1]?.url || item.track?.album?.images?.[0]?.url || null,
            spotifyUri: item.track?.uri || null,
            msPlayed: item.track?.duration_ms || 0, // Full track duration as approximation
            playedAt: new Date(item.played_at),
            source: 'API',
            platform: 'spotify-api',
        }));

        // Insert with skipDuplicates (ON CONFLICT DO NOTHING)
        const beforeCount = await prisma.streamingHistory.count({
            where: { userId, source: 'API' }
        });

        await prisma.streamingHistory.createMany({
            data: historyEntries,
            skipDuplicates: true,
        });

        const afterCount = await prisma.streamingHistory.count({
            where: { userId, source: 'API' }
        });

        const collected = afterCount - beforeCount;
        const skipped = items.length - collected;

        console.log(`[ListeningHistory] User ${userId}: collected=${collected}, skipped=${skipped}`);

        return { collected, skipped };
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
            // Most looped track (groupBy)
            prisma.streamingHistory.groupBy({
                by: ['trackName', 'artistName', 'albumImage'],
                where,
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 1
            }),
            // PERFORMANCE FIX: Aggregate hours in SQL instead of loading all records into memory
            prisma.$queryRaw`
                SELECT EXTRACT(HOUR FROM "playedAt")::int as hour, COUNT(*)::int as count
                FROM "StreamingHistory"
                WHERE "userId" = ${userId}
                ${from ? Prisma.sql`AND "playedAt" >= ${from}` : Prisma.empty}
                ${to ? Prisma.sql`AND "playedAt" <= ${to}` : Prisma.empty}
                GROUP BY hour ORDER BY hour
            `,
            // Unique tracks count for listening mode
            prisma.streamingHistory.groupBy({
                by: ['trackName', 'artistName'],
                where,
            })
        ]);

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
                    count: mostLoopedResult[0]._count.id
                } : null,
                topHours,
                uniqueTracks: uniqueTracksResult.length,
                repeatRatio: total > 0 ? 1 - (uniqueTracksResult.length / total) : 0
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

    // Get all plays in the date range
    const plays = await prisma.streamingHistory.findMany({
        where: {
            userId,
            playedAt: { gte: startDate },
        },
        select: { playedAt: true },
    });

    // Aggregate by day of week
    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    plays.forEach(play => {
        const dayOfWeek = play.playedAt.getDay();
        dayCounts[dayOfWeek]++;
    });

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
        SELECT EXTRACT(HOUR FROM "playedAt")::int as hour, COUNT(*)::int as count
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

    // Get all users with valid refresh tokens
    const users = await prisma.user.findMany({
        where: { refreshToken: { not: null } },
        select: {
            id: true,
            spotifyId: true,
            displayName: true,
            refreshToken: true
        }
    });

    if (users.length === 0) {
        console.log(JSON.stringify({
            severity: 'INFO',
            message: 'No users with valid tokens found',
            timestamp,
            component: 'spotify-sync'
        }));
        return { processed: 0, failed: 0, skipped: 0, duration: Date.now() - startTime, details: [] };
    }

    console.log(JSON.stringify({
        severity: 'INFO',
        message: `Found ${users.length} users to process`,
        timestamp,
        component: 'spotify-sync',
        userCount: users.length
    }));

    const encryptionService = require('./encryptionService');
    const results = {
        processed: 0,
        failed: 0,
        skipped: 0,
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
        const userName = user.displayName || user.spotifyId;

        try {
            // 1. Decrypt and refresh token
            const decryptedToken = encryptionService.decrypt(user.refreshToken);
            const tokens = await spotifyService.refreshAccessToken(decryptedToken);

            if (!tokens?.accessToken) {
                console.log(`[Cron] User ${userName}: Failed to get access token, skipping`);
                results.skipped++;
                results.details.push({ userId: user.id, status: 'skipped', reason: 'no_access_token' });
                continue;
            }

            // 2. Collect history
            const result = await collectFromAPI(user.id, tokens.accessToken);

            // 3. Update lastSyncAt timestamp
            await prisma.user.update({
                where: { id: user.id },
                data: { lastSyncAt: new Date() }
            });

            results.processed++;
            results.details.push({
                userId: user.id,
                status: 'success',
                collected: result.collected,
                skipped: result.skipped
            });

            if (result.collected > 0) {
                console.log(`[Cron] User ${userName}: collected=${result.collected}, skipped=${result.skipped}`);
            }

        } catch (error) {
            console.error(`[Cron] User ${userName}: Error - ${error.message}`);

            // If token is revoked/invalid, clear it from DB
            if (error.message?.includes('invalid_grant') ||
                error.message?.includes('revoked') ||
                error.body?.error === 'invalid_grant') {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { refreshToken: null }
                });
                results.details.push({ userId: user.id, status: 'failed', reason: 'token_revoked' });
            } else {
                results.details.push({ userId: user.id, status: 'failed', reason: error.message });
            }
            results.failed++;
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
    getUserHistory,
    getListeningByDay,
    getListeningByHour,
    getCollectionStats,
    collectForAllActiveUsers,
};
