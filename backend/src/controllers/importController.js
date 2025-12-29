/**
 * Import Controller
 * Handles Spotify extended streaming history import with validation and aggregation
 */
const prisma = require('../utils/prismaClient');
const { validateImportRequest, MAX_TRACKS_PER_FILE } = require('../utils/validation');
const importService = require('../services/importService');

/**
 * POST /api/import/upload
 * Upload and process Spotify streaming history JSON files
 * Supports both raw JSON array in body and file upload format
 */
async function uploadHistory(req, res, next) {
    try {
        const userId = req.user.id;

        // Validate request body with Zod
        const validation = validateImportRequest(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: validation.error
            });
        }

        const { files, fileName } = validation.data;

        if (!files || files.length === 0) {
            return res.status(400).json({
                error: 'InvalidData',
                message: 'No streaming history data provided'
            });
        }

        // Create import job
        const importJob = await prisma.import.create({
            data: {
                userId,
                fileName: fileName || 'streaming_history.json',
                fileSize: JSON.stringify(files).length,
                status: 'PENDING',
                totalTracks: files.length
            }
        });

        // Process using importService (handles both streaming history and aggregation)
        try {
            const result = await importService.processStreamingHistory(
                JSON.stringify(files),
                userId,
                importJob.id
            );

            return res.json({
                success: true,
                message: 'Import completed successfully',
                importId: importJob.id,
                ...result
            });
        } catch (processError) {
            // Update import as failed
            await prisma.import.update({
                where: { id: importJob.id },
                data: {
                    status: 'FAILED',
                    errorMessage: processError.message,
                    completedAt: new Date()
                }
            });

            return res.status(400).json({
                success: false,
                error: 'ImportError',
                message: processError.message,
                importId: importJob.id
            });
        }
    } catch (error) {
        console.error('Upload history error:', error.message);
        next(error);
    }
}

/**
 * POST /api/import/file
 * Upload JSON file directly (multipart/form-data)
 */
async function uploadFile(req, res, next) {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({
                error: 'InvalidFile',
                message: 'No file uploaded'
            });
        }

        const { originalname, size, buffer } = req.file;

        // Validate file type
        if (!originalname.endsWith('.json')) {
            return res.status(400).json({
                error: 'InvalidFile',
                message: 'Only JSON files are allowed'
            });
        }

        // Size limit: 200MB
        if (size > 200 * 1024 * 1024) {
            return res.status(400).json({
                error: 'FileTooLarge',
                message: 'File size must be less than 200MB'
            });
        }

        // Create import job
        const importJob = await prisma.import.create({
            data: {
                userId,
                fileName: originalname,
                fileSize: size,
                status: 'PENDING'
            }
        });

        // Process using importService
        try {
            const result = await importService.processStreamingHistory(
                buffer,
                userId,
                importJob.id
            );

            return res.json({
                success: true,
                message: 'Import completed successfully',
                importId: importJob.id,
                fileName: originalname,
                fileSize: size,
                ...result
            });
        } catch (processError) {
            await prisma.import.update({
                where: { id: importJob.id },
                data: {
                    status: 'FAILED',
                    errorMessage: processError.message,
                    completedAt: new Date()
                }
            });

            return res.status(400).json({
                success: false,
                error: 'ImportError',
                message: processError.message,
                importId: importJob.id
            });
        }
    } catch (error) {
        console.error('Upload file error:', error.message);
        next(error);
    }
}

/**
 * GET /api/import/status
 * Get status of all imports for the user
 */
async function getImportStatus(req, res, next) {
    try {
        const userId = req.user.id;
        const stats = await importService.getImportStats(userId);

        res.json({
            success: true,
            ...stats
        });
    } catch (error) {
        console.error('Get import status error:', error.message);
        next(error);
    }
}

/**
 * GET /api/import/:id
 * Get status of a specific import
 */
async function getImportById(req, res, next) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const importJob = await prisma.import.findFirst({
            where: { id, userId }
        });

        if (!importJob) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Import not found'
            });
        }

        res.json({
            success: true,
            import: importJob
        });
    } catch (error) {
        console.error('Get import by ID error:', error.message);
        next(error);
    }
}

/**
 * GET /api/import/stats
 * Get statistics from imported history (uses AggregatedStats)
 */
async function getHistoryStats(req, res, next) {
    try {
        const userId = req.user.id;

        // Get all-time top tracks from aggregated data
        const topTracks = await importService.getAllTimeTopTracks(userId, 10);
        const topArtists = await importService.getAllTimeTopArtists(userId, 10);

        // Get total stats
        const totals = await prisma.aggregatedStats.aggregate({
            where: { userId },
            _sum: { playCount: true, totalMsPlayed: true },
            _count: { trackUri: true }
        });

        const totalMs = Number(totals._sum.totalMsPlayed || 0);
        const totalHours = Math.floor(totalMs / 3600000);
        const totalMinutes = Math.floor((totalMs % 3600000) / 60000);

        res.json({
            success: true,
            stats: {
                uniqueTracks: totals._count.trackUri,
                totalPlays: totals._sum.playCount || 0,
                totalListeningTime: {
                    hours: totalHours,
                    minutes: totalMinutes,
                    formatted: `${totalHours}h ${totalMinutes}m`,
                    totalMs
                }
            },
            topTracks: topTracks.map((t, i) => ({
                rank: i + 1,
                name: t.trackName,
                artist: t.artistName,
                album: t.albumName,
                playCount: t.playCount,
                totalMinutes: Math.round(Number(t.totalMsPlayed) / 60000),
                firstPlayed: t.firstPlayed,
                lastPlayed: t.lastPlayed
            })),
            topArtists
        });
    } catch (error) {
        console.error('Get history stats error:', error.message);
        next(error);
    }
}

/**
 * DELETE /api/import/history
 * Delete all imported streaming history (GDPR)
 */
async function deleteHistory(req, res, next) {
    try {
        const userId = req.user.id;

        // Delete in transaction
        await prisma.$transaction([
            prisma.streamingHistory.deleteMany({ where: { userId } }),
            prisma.aggregatedStats.deleteMany({ where: { userId } }),
            prisma.import.deleteMany({ where: { userId } })
        ]);

        res.json({
            success: true,
            message: 'All imported history deleted successfully'
        });
    } catch (error) {
        console.error('Delete history error:', error.message);
        next(error);
    }
}

module.exports = {
    uploadHistory,
    uploadFile,
    getImportStatus,
    getImportById,
    getHistoryStats,
    deleteHistory
};
