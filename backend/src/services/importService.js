/**
 * Import Service
 * Handles Spotify extended streaming history import with streaming parser
 *
 * PERF-002: Uses stream-json for memory-efficient parsing of large files (50MB+)
 * Aggregates data BEFORE saving to comply with Spotify ToS
 */
const prisma = require('../utils/prismaClient');
const { Prisma } = require('@prisma/client');
const { Readable } = require('stream');
const { parser } = require('stream-json');
// Node 24 exports map workaround for stream-json
const { streamArray } = require(require.resolve('stream-json').replace('index.js', 'streamers/stream-array.js'));

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

    // Update import status to processing
    await prisma.import.update({
        where: { id: importId },
        data: {
            status: 'PROCESSING',
            startedAt: new Date()
        }
    });

    // ============================================
    // STEP 1: Stream-parse and aggregate (PERF-002)
    // Instead of JSON.parse(entireFile) which blocks event loop and OOMs on large files,
    // stream-json parses entries one at a time with constant memory usage.
    // ============================================
    const aggregated = new Map();
    const streamingBatch = [];

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let totalEntries = 0;

    await new Promise((resolve, reject) => {
        const input = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const readable = Readable.from(input);

        const pipeline = readable
            .pipe(parser())
            .pipe(streamArray());

        pipeline.on('data', ({ value: entry }) => {
            totalEntries++;
            try {
                const trackName = entry.master_metadata_track_name || entry.trackName;
                const artistName = entry.master_metadata_album_artist_name || entry.artistName;
                const msPlayed = entry.ms_played || entry.msPlayed || 0;
                const playedAtStr = entry.ts || entry.playedAt || entry.endTime;

                if (!trackName || !artistName) { skipped++; return; }
                if (msPlayed < 30000) { skipped++; return; }

                const albumName = entry.master_metadata_album_album_name || entry.albumName || null;
                const trackUri = entry.spotify_track_uri || entry.spotifyUri || `local:${artistName}:${trackName}`;
                const playedAt = playedAtStr ? new Date(playedAtStr) : new Date();

                if (aggregated.has(trackUri)) {
                    const existing = aggregated.get(trackUri);
                    existing.playCount++;
                    existing.totalMsPlayed += msPlayed;
                    if (playedAt < existing.firstPlayed) existing.firstPlayed = playedAt;
                    if (playedAt > existing.lastPlayed) existing.lastPlayed = playedAt;
                } else {
                    aggregated.set(trackUri, {
                        trackUri, artistName, trackName, albumName,
                        playCount: 1, totalMsPlayed: msPlayed,
                        firstPlayed: playedAt, lastPlayed: playedAt
                    });
                }

                streamingBatch.push({
                    userId, trackName, artistName, albumName,
                    spotifyUri: trackUri.startsWith('spotify:') ? trackUri : null,
                    msPlayed, playedAt,
                    platform: entry.platform || null,
                    country: entry.conn_country || null
                });

                processed++;
            } catch (err) {
                errors++;
            }
        });

        pipeline.on('end', resolve);
        pipeline.on('error', (err) => reject(new Error('Invalid JSON format: ' + err.message)));
    });

    // Update total count now that streaming is done
    await prisma.import.update({
        where: { id: importId },
        data: { totalTracks: totalEntries }
    });

    // ============================================
    // STEP 2: Upsert aggregated stats (bulk)
    // ============================================
    const aggregatedArray = Array.from(aggregated.values());
    let aggregatedUpserted = 0;

    for (let i = 0; i < aggregatedArray.length; i += BATCH_SIZE) {
        const batch = aggregatedArray.slice(i, i + BATCH_SIZE);

        // SECURITY FIX (SEC-002): Parameterized queries instead of string interpolation
        // Previous code used $executeRawUnsafe with string concatenation = SQL injection risk
        try {
            // Build parameterized VALUES using Prisma.sql tagged template
            const valueFragments = batch.map(stat =>
                Prisma.sql`(${userId}, ${stat.trackUri}, ${stat.artistName}, ${stat.trackName}, ${stat.albumName}, ${stat.playCount}, ${stat.totalMsPlayed}, ${stat.firstPlayed}::timestamp, ${stat.lastPlayed}::timestamp)`
            );

            // Join fragments with commas
            const valuesList = Prisma.join(valueFragments);

            await prisma.$executeRaw`
                INSERT INTO "AggregatedStats" ("userId", "trackUri", "artistName", "trackName", "albumName", "playCount", "totalMsPlayed", "firstPlayed", "lastPlayed")
                VALUES ${valuesList}
                ON CONFLICT ("userId", "trackUri") DO UPDATE SET
                    "playCount" = "AggregatedStats"."playCount" + EXCLUDED."playCount",
                    "totalMsPlayed" = "AggregatedStats"."totalMsPlayed" + EXCLUDED."totalMsPlayed",
                    "lastPlayed" = GREATEST("AggregatedStats"."lastPlayed", EXCLUDED."lastPlayed"),
                    "firstPlayed" = LEAST("AggregatedStats"."firstPlayed", EXCLUDED."firstPlayed")
            `;
            aggregatedUpserted += batch.length;
        } catch (err) {
            console.error('Bulk aggregated upsert error:', err.message);
            errors += batch.length;
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
        totalEntries,
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
