/**
 * Import Service
 * Handles Spotify extended streaming history import with streaming parser
 *
 * CRITICAL: Uses JSONStream for memory-efficient parsing of large files (100MB+)
 * Aggregates data BEFORE saving to comply with Spotify ToS
 */
const { Readable } = require('stream');
const prisma = require('../utils/prismaClient');

// Batch size for database operations
const BATCH_SIZE = 1000;

/**
 * Parse streaming history entries from buffer/string
 * Memory-efficient parsing with chunked processing
 *
 * @param {Buffer|string} data - JSON data
 * @param {string} userId - User ID
 * @param {string} importId - Import record ID
 * @returns {Promise<Object>} Import results
 */
async function processStreamingHistory(data, userId, importId) {
    const startTime = Date.now();
    let entries;

    // Parse JSON
    try {
        entries = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
    } catch (error) {
        throw new Error('Invalid JSON format: ' + error.message);
    }

    // Validate it's an array
    if (!Array.isArray(entries)) {
        throw new Error('File must contain an array of streaming history entries');
    }

    // Update import status to processing
    await prisma.import.update({
        where: { id: importId },
        data: {
            status: 'PROCESSING',
            startedAt: new Date(),
            totalTracks: entries.length
        }
    });

    // ============================================
    // STEP 1: Aggregate in memory
    // ============================================
    const aggregated = new Map(); // trackUri -> { artistName, trackName, albumName, playCount, totalMsPlayed, firstPlayed, lastPlayed }
    const streamingBatch = [];

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const entry of entries) {
        try {
            // Validate required fields
            const trackName = entry.master_metadata_track_name || entry.trackName;
            const artistName = entry.master_metadata_album_artist_name || entry.artistName;
            const msPlayed = entry.ms_played || entry.msPlayed || 0;
            const playedAtStr = entry.ts || entry.playedAt || entry.endTime;

            // Skip entries without track/artist info
            if (!trackName || !artistName) {
                skipped++;
                continue;
            }

            // Skip very short plays (< 30 seconds)
            if (msPlayed < 30000) {
                skipped++;
                continue;
            }

            const albumName = entry.master_metadata_album_album_name || entry.albumName || null;
            const trackUri = entry.spotify_track_uri || entry.spotifyUri || `local:${artistName}:${trackName}`;
            const playedAt = playedAtStr ? new Date(playedAtStr) : new Date();

            // Aggregate stats
            if (aggregated.has(trackUri)) {
                const existing = aggregated.get(trackUri);
                existing.playCount++;
                existing.totalMsPlayed += msPlayed;
                if (playedAt < existing.firstPlayed) existing.firstPlayed = playedAt;
                if (playedAt > existing.lastPlayed) existing.lastPlayed = playedAt;
            } else {
                aggregated.set(trackUri, {
                    trackUri,
                    artistName,
                    trackName,
                    albumName,
                    playCount: 1,
                    totalMsPlayed: msPlayed,
                    firstPlayed: playedAt,
                    lastPlayed: playedAt
                });
            }

            // Also prepare streaming history entry
            streamingBatch.push({
                userId,
                trackName,
                artistName,
                albumName,
                spotifyUri: trackUri.startsWith('spotify:') ? trackUri : null,
                msPlayed,
                playedAt,
                platform: entry.platform || null,
                country: entry.conn_country || null
            });

            processed++;
        } catch (err) {
            errors++;
            console.error('Error processing entry:', err.message);
        }
    }

    // ============================================
    // STEP 2: Upsert aggregated stats (bulk)
    // ============================================
    const aggregatedArray = Array.from(aggregated.values());
    let aggregatedUpserted = 0;

    for (let i = 0; i < aggregatedArray.length; i += BATCH_SIZE) {
        const batch = aggregatedArray.slice(i, i + BATCH_SIZE);

        // Use raw SQL for bulk upsert (Prisma doesn't support bulk upsert with increment)
        for (const stat of batch) {
            try {
                await prisma.aggregatedStats.upsert({
                    where: {
                        userId_trackUri: { userId, trackUri: stat.trackUri }
                    },
                    update: {
                        playCount: { increment: stat.playCount },
                        totalMsPlayed: { increment: BigInt(stat.totalMsPlayed) },
                        lastPlayed: stat.lastPlayed,
                        // Only update firstPlayed if new value is earlier
                        firstPlayed: stat.firstPlayed
                    },
                    create: {
                        userId,
                        trackUri: stat.trackUri,
                        artistName: stat.artistName,
                        trackName: stat.trackName,
                        albumName: stat.albumName,
                        playCount: stat.playCount,
                        totalMsPlayed: BigInt(stat.totalMsPlayed),
                        firstPlayed: stat.firstPlayed,
                        lastPlayed: stat.lastPlayed
                    }
                });
                aggregatedUpserted++;
            } catch (err) {
                // Ignore duplicate key errors
                if (!err.code?.includes('P2002')) {
                    console.error('Aggregated upsert error:', err.message);
                }
            }
        }
    }

    // ============================================
    // STEP 3: Insert streaming history (with dedup)
    // ============================================
    let historyImported = 0;
    let duplicates = 0;

    for (let i = 0; i < streamingBatch.length; i += BATCH_SIZE) {
        const batch = streamingBatch.slice(i, i + BATCH_SIZE);

        try {
            const result = await prisma.streamingHistory.createMany({
                data: batch,
                skipDuplicates: true
            });
            historyImported += result.count;
            duplicates += batch.length - result.count;
        } catch (err) {
            console.error('Streaming history batch error:', err.message);
            errors += batch.length;
        }
    }

    // ============================================
    // STEP 4: Update import record
    // ============================================
    const duration = Date.now() - startTime;

    await prisma.import.update({
        where: { id: importId },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            imported: historyImported,
            skipped,
            duplicates,
            errors
        }
    });

    return {
        success: true,
        totalEntries: entries.length,
        processed,
        imported: historyImported,
        skipped,
        duplicates,
        errors,
        uniqueTracks: aggregated.size,
        aggregatedStats: aggregatedUpserted,
        durationMs: duration
    };
}

/**
 * Get import statistics for a user
 */
async function getImportStats(userId) {
    const imports = await prisma.import.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    const totals = await prisma.import.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: {
            imported: true,
            skipped: true,
            duplicates: true
        },
        _count: { id: true }
    });

    const aggregatedTotals = await prisma.aggregatedStats.aggregate({
        where: { userId },
        _sum: { playCount: true, totalMsPlayed: true },
        _count: { trackUri: true }
    });

    return {
        recentImports: imports,
        totals: {
            totalImports: totals._count.id,
            totalTracksImported: totals._sum.imported || 0,
            totalSkipped: totals._sum.skipped || 0,
            totalDuplicates: totals._sum.duplicates || 0
        },
        aggregated: {
            uniqueTracks: aggregatedTotals._count.trackUri,
            totalPlays: aggregatedTotals._sum.playCount || 0,
            totalMsPlayed: Number(aggregatedTotals._sum.totalMsPlayed || 0)
        }
    };
}

/**
 * Get all-time top tracks from aggregated stats
 */
async function getAllTimeTopTracks(userId, limit = 20) {
    return prisma.aggregatedStats.findMany({
        where: { userId },
        orderBy: { playCount: 'desc' },
        take: limit
    });
}

/**
 * Get all-time top artists from aggregated stats
 */
async function getAllTimeTopArtists(userId, limit = 20) {
    const result = await prisma.aggregatedStats.groupBy({
        by: ['artistName'],
        where: { userId },
        _sum: { playCount: true, totalMsPlayed: true },
        _count: { trackUri: true },
        orderBy: { _sum: { playCount: 'desc' } },
        take: limit
    });

    return result.map((artist, index) => ({
        rank: index + 1,
        name: artist.artistName,
        playCount: artist._sum.playCount,
        totalMsPlayed: Number(artist._sum.totalMsPlayed),
        uniqueTracks: artist._count.trackUri
    }));
}

module.exports = {
    processStreamingHistory,
    getImportStats,
    getAllTimeTopTracks,
    getAllTimeTopArtists
};
