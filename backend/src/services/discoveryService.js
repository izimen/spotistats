/**
 * Discovery Service
 * Provides new music recommendations (Discovery Roulette)
 */
const prisma = require('../utils/prismaClient');
const spotifyService = require('./spotifyService');

/**
 * Format track for API response
 */
function formatTrack(track) {
    return {
        trackId: track.id,
        trackName: track.name,
        artistName: track.artists?.[0]?.name || 'Unknown',
        albumImage: track.album?.images?.[0]?.url || null,
        spotifyUrl: track.external_urls?.spotify || null,
        previewUrl: track.preview_url || null,
        popularity: track.popularity || 0
    };
}

/**
 * Get set of known track IDs for user
 */
async function getKnownTrackIds(userId) {
    const history = await prisma.streamingHistory.findMany({
        where: { userId, trackId: { not: null } },
        select: { trackId: true }
    });
    return new Set(history.map(h => h.trackId));
}

/**
 * Get discovery track recommendation for user
 * @param {string} userId - User ID
 * @param {string} accessToken - Spotify access token
 * @returns {object} Recommended track
 */
async function getDiscoveryTrack(userId, accessToken) {
    try {
        const spotifyApi = spotifyService.createSpotifyApi({ accessToken });

        // 1. Get user's top artists (for seeding recommendations)
        const topArtists = await prisma.streamingHistory.groupBy({
            by: ['artistName'],
            where: { userId },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        });

        if (topArtists.length === 0) {
            throw new Error('No listening history to generate recommendations');
        }

        // 2. Search for Spotify Artist IDs
        const seedArtistIds = [];
        for (const artist of topArtists.slice(0, 3)) {
            try {
                const result = await spotifyApi.searchArtists(artist.artistName, { limit: 1 });
                if (result.body?.artists?.items?.[0]) {
                    seedArtistIds.push(result.body.artists.items[0].id);
                }
            } catch (err) {
                console.warn(`[Discovery] Failed to find artist: ${artist.artistName}`);
            }
        }

        if (seedArtistIds.length === 0) {
            throw new Error('Could not find seed artists');
        }

        console.log(`[Discovery] Using ${seedArtistIds.length} seed artists`);

        // 3. Get recommendations from Spotify
        const recommendations = await spotifyApi.getRecommendations({
            seed_artists: seedArtistIds.slice(0, 5), // Max 5 seeds total
            limit: 30
        });

        const tracks = recommendations.body?.tracks || [];

        if (tracks.length === 0) {
            throw new Error('No recommendations returned from Spotify');
        }

        // 4. Filter out known tracks
        const knownIds = await getKnownTrackIds(userId);
        const newTracks = tracks.filter(t => !knownIds.has(t.id));

        console.log(`[Discovery] ${newTracks.length}/${tracks.length} tracks are new`);

        // 5. Score and select best track
        // Prefer mid-popularity tracks (40-70) - "hidden gems"
        const scored = (newTracks.length > 0 ? newTracks : tracks).map(t => {
            let score = t.popularity || 0;
            if (t.popularity >= 40 && t.popularity <= 70) {
                score += 25; // Bonus for sweet spot
            }
            return { ...t, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // Pick from top 5 randomly (add surprise element)
        const top5 = scored.slice(0, 5);
        const selected = top5[Math.floor(Math.random() * top5.length)];

        return formatTrack(selected);
    } catch (error) {
        console.error('[Discovery] Error:', error.message);
        throw error;
    }
}

module.exports = {
    getDiscoveryTrack,
    getKnownTrackIds,
    formatTrack
};
