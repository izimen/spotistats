/**
 * Music DNA Service
 * Calculates user's musical profile based on Spotify Audio Features
 */
const prisma = require('../utils/prismaClient');
const spotifyService = require('./spotifyService');

/**
 * Normalize loudness from dB to 0-100 scale
 * Range: -14dB (quiet) to -4dB (loud)
 */
function normalizeLoudness(dB) {
    const MIN_DB = -14;
    const MAX_DB = -4;
    const normalized = ((dB - MIN_DB) / (MAX_DB - MIN_DB)) * 100;
    return Math.max(0, Math.min(100, Math.round(normalized)));
}

/**
 * Calculate average of an array
 */
function avg(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate Music DNA profile from user's listening history
 * @param {string} userId - User ID
 * @param {string} accessToken - Spotify access token
 * @returns {object|null} DNA profile or null if insufficient data
 */
async function calculateMusicDNA(userId, accessToken) {
    try {
        // 1. Get top 50 tracks from history (with trackId)
        const history = await prisma.streamingHistory.findMany({
            where: {
                userId,
                trackId: { not: null }
            },
            orderBy: { playedAt: 'desc' },
            take: 50,
            select: { trackId: true }
        });

        // Remove duplicates
        const trackIds = [...new Set(history.map(h => h.trackId).filter(Boolean))];

        if (trackIds.length < 5) {
            console.log(`[MusicDNA] User ${userId}: insufficient tracks (${trackIds.length})`);
            return null;
        }

        console.log(`[MusicDNA] Fetching audio features for ${trackIds.length} tracks`);

        // 2. Fetch Audio Features from Spotify (batch, max 100)
        const featuresResult = await spotifyService.getAudioFeatures(accessToken, trackIds);
        const features = featuresResult.body?.audio_features?.filter(Boolean) || [];

        if (features.length === 0) {
            console.log(`[MusicDNA] User ${userId}: no audio features returned`);
            return null;
        }

        // 3. Calculate averages
        const dna = {
            energy: Math.round(avg(features.map(f => f.energy)) * 100),
            danceability: Math.round(avg(features.map(f => f.danceability)) * 100),
            acoustic: Math.round(avg(features.map(f => f.acousticness)) * 100),
            nostalgia: Math.round((1 - avg(features.map(f => f.valence))) * 100), // Inverted valence
            loudness: normalizeLoudness(avg(features.map(f => f.loudness))),
            tracksAnalyzed: features.length
        };

        console.log(`[MusicDNA] User ${userId}: calculated DNA from ${features.length} tracks`);

        return dna;
    } catch (error) {
        console.error('[MusicDNA] Calculation error:', error.message);
        throw error;
    }
}

module.exports = {
    calculateMusicDNA,
    normalizeLoudness
};
