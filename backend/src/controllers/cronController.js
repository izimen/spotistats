/**
 * Cron Controller
 * Handles scheduled job endpoints for GCP Cloud Scheduler
 */
const prisma = require('../utils/prismaClient');
const listeningHistoryService = require('../services/listeningHistoryService');

/**
 * POST /api/cron/sync-listening-history
 * Called by GCP Cloud Scheduler every 6 hours
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

        res.json({
            success: true,
            processed: result.processed,
            failed: result.failed,
            skipped: result.skipped,
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
        const [stats, totalUsers, usersWithToken] = await Promise.all([
            prisma.user.aggregate({
                where: { lastSyncAt: { not: null } },
                _count: true,
                _max: { lastSyncAt: true },
                _min: { lastSyncAt: true }
            }),
            prisma.user.count(),
            prisma.user.count({ where: { refreshToken: { not: null } } })
        ]);

        res.json({
            success: true,
            status: {
                schedule: '0 */6 * * *',
                scheduleDescription: 'Every 6 hours',
                timezone: 'Europe/Warsaw',
                totalUsers,
                usersWithValidToken: usersWithToken,
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

        // Delete orphaned aggregated stats (users without valid token for 30+ days)
        // This is optional and conservative
        const deletedStats = await prisma.aggregatedStats.deleteMany({
            where: {
                user: {
                    refreshToken: null,
                    updatedAt: { lt: thirtyDaysAgo }
                }
            }
        });

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
