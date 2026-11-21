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
        albumImage: track.album?.images?.[2]?.url || track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
        spotifyUrl: track.external_urls?.spotify || null,
        previewUrl: track.preview_url || null,
        popularity: track.popularity || 0
    };
}

/**
 * Get set of known track IDs for user.
 * PERF: when candidate IDs are given, only those are looked up (the old version loaded
 * every play the user ever had - tens of thousands of rows after a GDPR import).
 */
async function getKnownTrackIds(userId, candidateIds) {
    const where = { userId, trackId: candidateIds ? { in: candidateIds } : { not: null } };
    const history = await prisma.streamingHistory.findMany({
        where,
        select: { trackId: true },
        distinct: ['trackId']
    });
    return new Set(history.map(h => h.trackId));
}

/**
 * Fallback when /recommendations is unavailable: search tracks by the seed artists' genres.
 * Search `limit` is capped at 10 for dev-mode apps (Feb 2026).
 */
async function searchTracksByGenres(spotifyApi, genres) {
    const results = await Promise.all(genres.slice(0, 3).map(async (genre) => {
        try {
            const offset = Math.floor(Math.random() * 40);
            const result = await spotifyApi.searchTracks(`genre:"${genre.replace(/"/g, '')}"`, { limit: 10, offset });
            return result.body?.tracks?.items || [];
        } catch (err) {
            console.warn(`[Discovery] Genre search failed for "${genre}": ${err.message}`);
            return [];
        }
    }));
    return results.flat();
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
            return null; // no listening history yet
        }

        // 2. Search for Spotify Artist IDs
        // PERF: the three artist searches are independent - run them in parallel
        const seedArtistIds = [];
        const seedGenres = [];
        const searches = await Promise.all(topArtists.slice(0, 3).map(artist =>
            spotifyApi.searchArtists(artist.artistName, { limit: 1 })
                .then(result => result.body?.artists?.items?.[0] || null)
                .catch(() => {
                    console.warn(`[Discovery] Failed to find artist: ${artist.artistName}`);
                    return null;
                })
        ));
        for (const found of searches) {
            if (!found) continue;
            seedArtistIds.push(found.id);
            for (const g of found.genres || []) {
                if (!seedGenres.includes(g)) seedGenres.push(g);
            }
        }

        if (seedArtistIds.length === 0) {
            return null; // seed artists not found on Spotify
        }

        console.log(`[Discovery] Using ${seedArtistIds.length} seed artists`);

        // 3. Get recommendations from Spotify.
        // GET /recommendations is restricted for new / dev-mode apps (Nov 2024) -
        // getRecommendations() resolves null then, and we fall back to genre search.
        const recommendations = await spotifyService.getRecommendations(accessToken, {
            seed_artists: seedArtistIds.slice(0, 5), // Max 5 seeds total
            limit: 30
        });

        let tracks = recommendations?.body?.tracks || [];

        if (tracks.length === 0) {
            tracks = await searchTracksByGenres(spotifyApi, seedGenres);
        }

        if (tracks.length === 0) {
            return null;
        }

        // 4. Filter out known tracks
        const knownIds = await getKnownTrackIds(userId, tracks.map(t => t.id).filter(Boolean));
        const newTracks = tracks.filter(t => !knownIds.has(t.id));

        console.log(`[Discovery] ${newTracks.length}/${tracks.length} tracks are new`);

        // 4.5 Filter out tracks from seed artists (avoid same artist)
        const seedArtistNames = new Set(topArtists.slice(0, 3).map(a => a.artistName.toLowerCase()));
        const diverseTracks = newTracks.filter(t => {
            const trackArtist = t.artists?.[0]?.name?.toLowerCase();
            return !seedArtistNames.has(trackArtist);
        });

        console.log(`[Discovery] ${diverseTracks.length}/${newTracks.length} tracks from different artists`);

        // 5. Score and select best track
        // Prefer mid-popularity tracks (40-70) - "hidden gems"
        const tracksToScore = diverseTracks.length > 0 ? diverseTracks : (newTracks.length > 0 ? newTracks : tracks);
        const scored = tracksToScore.map(t => {
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
