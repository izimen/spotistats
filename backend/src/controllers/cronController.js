/**
 * Cron Controller
 * Handles scheduled job endpoints for GCP Cloud Scheduler
 */
const prisma = require('../utils/prismaClient');
const listeningHistoryService = require('../services/listeningHistoryService');

/**
 * POST /api/cron/sync-listening-history
 * Called by GCP Cloud Scheduler every hour (recently-played only returns the last 50 plays)
 */
async function syncListeningHistory(req, res, next) {
    try {
        console.log(JSON.stringify({
            severity: 'INFO',
            message: 'Cron sync-listening-history started',
            timestamp: new Date().toISOString(),
            component: 'cron-controller'
        }));

        const result = await listeningHistoryService.collectForAllActiveUsers();

        console.log(JSON.stringify({
            severity: 'INFO',
            message: 'Cron sync-listening-history completed',
            timestamp: new Date().toISOString(),
            component: 'cron-controller',
            processed: result.processed,
            failed: result.failed,
            skipped: result.skipped,
            duration: result.duration
        }));

        // Non-2xx makes Cloud Scheduler record the run as failed (alertable):
        // quota exhausted, or there were users to sync and none succeeded.
        const runFailed = result.quotaExceeded || (result.total > 0 && result.processed === 0);
        if (runFailed) {
            console.error(JSON.stringify({
                severity: 'ERROR',
                message: result.quotaExceeded ? 'Cron sync stopped: Spotify rate limit / quota' : 'Cron sync: no user synced',
                timestamp: new Date().toISOString(),
                component: 'spotify-sync',
                processed: result.processed,
                failed: result.failed,
                total: result.total
            }));
        }

        res.status(runFailed ? 500 : 200).json({
            success: !runFailed,
            processed: result.processed,
            failed: result.failed,
            skipped: result.skipped,
            quotaExceeded: result.quotaExceeded,
            duration: `${result.duration}ms`
        });
    } catch (error) {
        console.error(JSON.stringify({
            severity: 'ERROR',
            message: 'Cron sync-listening-history failed',
            timestamp: new Date().toISOString(),
            component: 'cron-controller',
            error: error.message
        }));
        next(error);
    }
}

/**
 * GET /api/cron/status
 * Returns cron job status and sync statistics
 * Requires user authentication (protect middleware)
 */
async function getStatus(req, res, next) {
    try {
        const [stats, totalUsers, usersWithToken, usersCollecting, usersFailing, gaps] = await Promise.all([
            prisma.user.aggregate({
                where: { lastSyncAt: { not: null } },
                _count: true,
                _max: { lastSyncAt: true },
                _min: { lastSyncAt: true }
            }),
            prisma.user.count(),
            prisma.user.count({ where: { refreshToken: { not: null } } }),
            prisma.user.count({ where: { refreshToken: { not: null }, collectionEnabled: true } }),
            prisma.user.count({ where: { syncFailureCount: { gt: 0 } } }),
            prisma.user.aggregate({ _max: { lastGapDetectedAt: true } })
        ]);

        res.json({
            success: true,
            status: {
                schedule: '0 * * * *',
                scheduleDescription: 'Every hour',
                timezone: 'Europe/Warsaw',
                totalUsers,
                usersWithValidToken: usersWithToken,
                usersCollecting,
                usersFailing,
                lastGapDetected: gaps._max?.lastGapDetectedAt || null,
                usersSynced: stats._count,
                lastSync: stats._max?.lastSyncAt || null,
                oldestSync: stats._min?.lastSyncAt || null
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/cron/cleanup
 * Called by GCP Cloud Scheduler weekly to clean old data
 * - Removes CachedTopItems older than 30 days
 * - Removes orphaned aggregated_stats
 */
async function cleanupOldData(req, res, next) {
    try {
        const startTime = Date.now();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        console.log(JSON.stringify({
            severity: 'INFO',
            message: 'Cron cleanup started',
            timestamp: new Date().toISOString(),
            component: 'cron-controller'
        }));

        // Delete old cached items (> 30 days)
        const deletedCache = await prisma.cachedTopItems.deleteMany({
            where: {
                updatedAt: { lt: thirtyDaysAgo }
            }
        });

        // AggregatedStats are user data (all-time stats from the GDPR import) - never
        // deleted here. They used to be wiped for every user without a Spotify token.
        const deletedStats = { count: 0 };

        const duration = Date.now() - startTime;

        console.log(JSON.stringify({
            severity: 'INFO',
            message: 'Cron cleanup completed',
            timestamp: new Date().toISOString(),
            component: 'cron-controller',
            deletedCache: deletedCache.count,
            deletedStats: deletedStats.count,
            duration
        }));

        res.json({
            success: true,
            deleted: {
                cachedTopItems: deletedCache.count,
                aggregatedStats: deletedStats.count
            },
            duration: `${duration}ms`
        });
    } catch (error) {
        console.error(JSON.stringify({
            severity: 'ERROR',
            message: 'Cron cleanup failed',
            timestamp: new Date().toISOString(),
            component: 'cron-controller',
            error: error.message
        }));
        next(error);
    }
}

module.exports = {
    syncListeningHistory,
    getStatus,
    cleanupOldData
};
