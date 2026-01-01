/**
 * Stats Controller
 * Handles top artists, tracks, albums and listening statistics with caching
 */
const prisma = require('../utils/prismaClient');
const spotifyService = require('../services/spotifyService');
const encryptionService = require('../services/encryptionService');
const listeningHistoryService = require('../services/listeningHistoryService');
const musicDNAService = require('../services/musicDNAService');
const predictionService = require('../services/predictionService');
const discoveryService = require('../services/discoveryService');

// Valid time ranges
const VALID_TIME_RANGES = ['short_term', 'medium_term', 'long_term'];

// Time range labels for frontend
const TIME_RANGE_LABELS = {
    short_term: 'Last 4 Weeks',
    medium_term: 'Last 6 Months',
    long_term: 'All Time'
};

/**
 * Validate query parameters
 */
function validateParams(req) {
    let { time_range = 'medium_term', limit = 20 } = req.query;

    // Normalize time_range (support both time_range and term)
    time_range = req.query.term || time_range;

    if (!VALID_TIME_RANGES.includes(time_range)) {
        time_range = 'medium_term';
    }

    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 1) limit = 1;
    if (limit > 50) limit = 50;

    return { time_range, limit };
}

/**
 * Get fresh access token for user
 * First tries to use the access token from JWT if still valid,
 * otherwise refreshes using the stored refresh token
 */
async function getAccessToken(req, user) {
    // First check if we have a valid access token from the JWT
    const jwtAccessToken = req.spotifyAccessToken;
    const jwtTokenExpiry = req.spotifyTokenExpiry;

    // If JWT token exists and hasn't expired (with 5 min buffer)
    if (jwtAccessToken && jwtTokenExpiry) {
        const expiryTime = new Date(jwtTokenExpiry).getTime();
        const now = Date.now();
        const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

        if (expiryTime > now + bufferMs) {
            console.log('Using access token from JWT (still valid)');
            return jwtAccessToken;
        }
        console.log('JWT access token expired, refreshing...');
    }

    // Need to refresh - check if we have a refresh token
    if (!user.refreshToken) {
        const error = new Error('No refresh token available. Please log in again.');
        error.code = 'NO_REFRESH_TOKEN';
        error.statusCode = 401;
        throw error;
    }

    try {
        const decryptedRefreshToken = encryptionService.decrypt(user.refreshToken);
        const tokens = await spotifyService.refreshAccessToken(decryptedRefreshToken);
        console.log('Token refreshed successfully');
        return tokens.accessToken;
    } catch (err) {
        // Handle revoked/invalid refresh token
        if (err.message?.includes('invalid_grant') ||
            err.message?.includes('revoked') ||
            err.body?.error === 'invalid_grant') {

            // Clear the invalid token from DB
            await prisma.user.update({
                where: { id: user.id },
                data: { refreshToken: null }
            });

            const error = new Error('Session expired. Please log in again.');
            error.code = 'REFRESH_TOKEN_REVOKED';
            error.statusCode = 401;
            throw error;
        }
        throw err;
    }
}


// ============================================
// GET /api/stats/top-artists
// ============================================
async function getTopArtists(req, res, next) {
    try {
        const { time_range, limit } = validateParams(req);
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const result = await spotifyService.getTopArtists(accessToken, userId, {
            time_range,
            limit
        });

        const artists = (result.body.items || []).map((artist, index) => ({
            rank: index + 1,
            id: artist.id,
            name: artist.name,
            genres: artist.genres || [],
            popularity: artist.popularity,
            followers: artist.followers?.total || 0,
            image: artist.images?.[0]?.url || null,
            spotifyUrl: artist.external_urls?.spotify
        }));

        res.json({
            success: true,
            timeRange: time_range,
            timeRangeLabel: TIME_RANGE_LABELS[time_range],
            fromCache: result.fromCache,
            total: artists.length,
            artists
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/top-tracks
// ============================================
async function getTopTracks(req, res, next) {
    try {
        const { time_range, limit } = validateParams(req);
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const result = await spotifyService.getTopTracks(accessToken, userId, {
            time_range,
            limit
        });

        const tracks = (result.body.items || []).map((track, index) => ({
            rank: index + 1,
            id: track.id,
            name: track.name,
            artists: track.artists?.map(a => ({ id: a.id, name: a.name })) || [],
            album: {
                id: track.album?.id,
                name: track.album?.name,
                image: track.album?.images?.[0]?.url || null,
                releaseDate: track.album?.release_date || null
            },
            duration: track.duration_ms,
            popularity: track.popularity,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls?.spotify
        }));

        res.json({
            success: true,
            timeRange: time_range,
            timeRangeLabel: TIME_RANGE_LABELS[time_range],
            fromCache: result.fromCache,
            total: tracks.length,
            tracks
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/top-albums
// ============================================
async function getTopAlbums(req, res, next) {
    try {
        const { time_range, limit } = validateParams(req);
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const result = await spotifyService.getTopAlbums(accessToken, userId, {
            time_range,
            limit
        });

        const albums = (result.body.items || []).map((album, index) => ({
            rank: index + 1,
            id: album.id,
            name: album.name,
            artists: album.artists?.map(a => ({ id: a.id, name: a.name })) || [],
            image: album.images?.[0]?.url || null,
            releaseDate: album.release_date,
            totalTracks: album.total_tracks,
            trackCount: album.trackCount // How many of user's top tracks are from this album
        }));

        res.json({
            success: true,
            timeRange: time_range,
            timeRangeLabel: TIME_RANGE_LABELS[time_range],
            fromCache: result.fromCache,
            total: albums.length,
            albums
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/recent
// ============================================
async function getRecentlyPlayed(req, res, next) {
    try {
        let { limit = 20 } = req.query;
        limit = parseInt(limit, 10);
        if (isNaN(limit) || limit < 1) limit = 1;
        if (limit > 50) limit = 50;

        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const result = await spotifyService.getRecentlyPlayed(accessToken, { limit });

        // Trigger history collection in background (non-blocking)
        listeningHistoryService.collectFromAPI(userId, accessToken)
            .catch(err => console.error('[StatsController] History collection failed:', err.message));

        const tracks = (result.body.items || []).map((item, index) => ({
            playedAt: item.played_at,
            track: {
                id: item.track?.id,
                name: item.track?.name,
                artists: item.track?.artists?.map(a => ({ id: a.id, name: a.name })) || [],
                album: {
                    id: item.track?.album?.id,
                    name: item.track?.album?.name,
                    image: item.track?.album?.images?.[0]?.url || null
                },
                duration: item.track?.duration_ms,
                spotifyUrl: item.track?.external_urls?.spotify
            }
        }));

        res.json({
            success: true,
            total: tracks.length,
            tracks
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/overview
// ============================================
async function getOverview(req, res, next) {
    try {
        const userId = req.user.id;

        // Get imported stats from AggregatedStats
        const aggregatedStats = await prisma.aggregatedStats.aggregate({
            where: { userId },
            _sum: { playCount: true, totalMsPlayed: true },
            _count: { trackUri: true }
        });

        // Get top track from aggregated data
        const topTrack = await prisma.aggregatedStats.findFirst({
            where: { userId },
            orderBy: { playCount: 'desc' }
        });

        // Get top artist from aggregated data
        const topArtistAgg = await prisma.aggregatedStats.groupBy({
            by: ['artistName'],
            where: { userId },
            _sum: { playCount: true, totalMsPlayed: true },
            orderBy: { _sum: { playCount: 'desc' } },
            take: 1
        });

        // Get import stats
        const importStats = await prisma.import.aggregate({
            where: { userId, status: 'COMPLETED' },
            _count: { id: true },
            _sum: { imported: true }
        });

        // Calculate listening time
        const totalMsPlayed = Number(aggregatedStats._sum.totalMsPlayed || 0);
        const totalHours = Math.round(totalMsPlayed / 3600000);
        const totalMinutes = Math.round((totalMsPlayed % 3600000) / 60000);

        res.json({
            success: true,
            overview: {
                // All-time stats from imports
                allTime: {
                    totalTracks: aggregatedStats._count.trackUri || 0,
                    totalPlays: aggregatedStats._sum.playCount || 0,
                    totalListeningTime: {
                        hours: totalHours,
                        minutes: totalMinutes,
                        formatted: `${totalHours}h ${totalMinutes}m`
                    },
                    topTrack: topTrack ? {
                        name: topTrack.trackName,
                        artist: topTrack.artistName,
                        playCount: topTrack.playCount
                    } : null,
                    topArtist: topArtistAgg[0] ? {
                        name: topArtistAgg[0].artistName,
                        playCount: topArtistAgg[0]._sum.playCount,
                        listeningTime: Math.round(Number(topArtistAgg[0]._sum.totalMsPlayed || 0) / 60000)
                    } : null
                },
                // Import history
                imports: {
                    totalImports: importStats._count.id || 0,
                    totalTracksImported: importStats._sum.imported || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// POST /api/stats/clear-cache
// ============================================
async function clearCache(req, res, next) {
    try {
        const userId = req.user.id;

        const success = await spotifyService.clearCache(userId);

        if (success) {
            res.json({
                success: true,
                message: 'Cache cleared successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to clear cache'
            });
        }
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/listening-history/chart
// ============================================
async function getListeningChart(req, res, next) {
    try {
        const { days = 7 } = req.query;
        const userId = req.user.id;

        const data = await listeningHistoryService.getListeningByDay(
            userId,
            parseInt(days, 10)
        );

        const stats = await listeningHistoryService.getCollectionStats(userId);

        res.json({
            success: true,
            days: data,
            stats: {
                totalPlays: stats.totalPlays,
                firstPlay: stats.firstPlay,
                lastPlay: stats.lastPlay,
                collectionActive: stats.collectionActive,
            }
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/listening-history/heatmap
// ============================================
async function getListeningHeatmap(req, res, next) {
    try {
        const userId = req.user.id;

        const heatmap = await listeningHistoryService.getListeningByHour(userId);

        res.json({
            success: true,
            data: heatmap
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// POST /api/stats/listening-history/sync
// ============================================
async function syncListeningHistory(req, res, next) {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const result = await listeningHistoryService.collectFromAPI(userId, accessToken);

        res.json({
            success: true,
            collected: result.collected,
            skipped: result.skipped,
            message: result.collected > 0
                ? `Zsynchronizowano ${result.collected} nowych utworĂłw`
                : 'Brak nowych utworĂłw do synchronizacji'
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/listening-history
// ============================================
async function getListeningHistory(req, res, next) {
    try {
        const { limit = 50, offset = 0, from, to } = req.query;
        const userId = req.user.id;

        const options = {
            limit: Math.min(parseInt(limit, 10) || 50, 100),
            offset: parseInt(offset, 10) || 0,
        };

        if (from) options.from = new Date(from);
        if (to) options.to = new Date(to);

        const result = await listeningHistoryService.getUserHistory(userId, options);

        res.json({
            success: true,
            plays: result.plays,
            total: result.total,
            hasMore: result.hasMore,
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// Helper functions
// ============================================

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDurationLong(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// ============================================
// GET /api/stats/audio-features
// ============================================
async function getAudioFeatures(req, res, next) {
    try {
        const userId = req.user.id;
        const { ids } = req.query;

        if (!ids) {
            return res.status(400).json({
                success: false,
                error: 'Track IDs required (comma-separated)'
            });
        }

        // Validate that ids is a string to prevent type confusion attacks
        if (typeof ids !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Track IDs must be a comma-separated string'
            });
        }

        const trackIds = ids.split(',').map(id => id.trim()).filter(Boolean);

        if (trackIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one track ID required'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const result = await spotifyService.getAudioFeatures(accessToken, trackIds);

        // Calculate average features for mood analysis
        const features = result.body.audio_features || [];
        const validFeatures = features.filter(f => f !== null);

        let averages = null;
        if (validFeatures.length > 0) {
            averages = {
                danceability: validFeatures.reduce((sum, f) => sum + f.danceability, 0) / validFeatures.length,
                energy: validFeatures.reduce((sum, f) => sum + f.energy, 0) / validFeatures.length,
                valence: validFeatures.reduce((sum, f) => sum + f.valence, 0) / validFeatures.length,
                tempo: validFeatures.reduce((sum, f) => sum + f.tempo, 0) / validFeatures.length,
                acousticness: validFeatures.reduce((sum, f) => sum + f.acousticness, 0) / validFeatures.length,
                instrumentalness: validFeatures.reduce((sum, f) => sum + f.instrumentalness, 0) / validFeatures.length,
                speechiness: validFeatures.reduce((sum, f) => sum + f.speechiness, 0) / validFeatures.length,
            };
        }

        // Determine mood based on averages
        let mood = 'đźŽµ ZrĂłwnowaĹĽony';
        if (averages) {
            if (averages.valence > 0.7 && averages.energy > 0.7) {
                mood = 'đźŽ‰ Imprezowy';
            } else if (averages.valence < 0.3) {
                mood = 'đź’” Melancholijny';
            } else if (averages.energy > 0.8) {
                mood = 'đź’Ş Energiczny';
            } else if (averages.acousticness > 0.7) {
                mood = 'đźŚ Spokojny';
            } else if (averages.danceability > 0.7) {
                mood = 'đź’ Taneczny';
            } else if (averages.valence > 0.6) {
                mood = 'đź’• Romantyczny';
            }
        }

        res.json({
            success: true,
            trackCount: trackIds.length,
            featuresCount: validFeatures.length,
            averages,
            mood,
            features: validFeatures.map(f => ({
                id: f.id,
                danceability: f.danceability,
                energy: f.energy,
                valence: f.valence,
                tempo: Math.round(f.tempo),
                acousticness: f.acousticness,
                instrumentalness: f.instrumentalness,
                speechiness: f.speechiness,
                key: f.key,
                mode: f.mode,
                duration_ms: f.duration_ms
            }))
        });
    } catch (error) {
        // Log detailed error for diagnosis
        console.error('[getAudioFeatures] Error:', {
            message: error.message,
            statusCode: error.statusCode || error.response?.status,
            body: error.body || error.response?.data,
            userId: req.user?.id
        });

        // If Spotify returns 403, it might be a scope issue
        if (error.statusCode === 403 || error.response?.status === 403) {
            return res.status(403).json({
                success: false,
                error: 'Spotify API access denied. This may be a scope issue - user-read-recently-played scope might be missing.',
                details: error.body || error.message
            });
        }

        next(error);
    }
}

// ============================================
// GET /api/stats/dna - Music DNA Profile
// ============================================
async function getMusicDNA(req, res, next) {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const dna = await musicDNAService.calculateMusicDNA(userId, accessToken);

        if (!dna) {
            return res.json({
                success: true,
                data: null,
                message: 'NiewystarczajÄ…ca iloĹ›Ä‡ danych do analizy DNA'
            });
        }

        res.json({
            success: true,
            data: dna
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/prediction - Listening Prediction
// ============================================
async function getPredictionData(req, res, next) {
    try {
        const userId = req.user.id;

        const prediction = await predictionService.getPrediction(userId);

        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET /api/stats/discovery/roulette - Discovery Roulette
// ============================================
async function getDiscoveryRoulette(req, res, next) {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const accessToken = await getAccessToken(req, user);

        const track = await discoveryService.getDiscoveryTrack(userId, accessToken);

        res.json({
            success: true,
            data: track
        });
    } catch (error) {
        console.error('[Discovery] Roulette error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Nie udaĹ‚o siÄ™ wygenerowaÄ‡ rekomendacji'
        });
    }
}

module.exports = {
    getTopArtists,
    getTopTracks,
    getTopAlbums,
    getRecentlyPlayed,
    getOverview,
    clearCache,
    getListeningChart,
    syncListeningHistory,
    getListeningHistory,
    getListeningHeatmap,
    getAudioFeatures,
    getMusicDNA,
    getPredictionData,
    getDiscoveryRoulette,
};
