/**
 * Spotify Service
 * Handles Spotify API interactions with caching and rate limit handling
 */
const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios');
const env = require('../config/env');
const prisma = require('../utils/prismaClient');

// Rate limit state
let rateLimitReset = null;

// Cache TTL (24 hours in milliseconds)
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Create configured Spotify API instance
 */
function createSpotifyApi(options = {}) {
    return new SpotifyWebApi({
        clientId: env.spotify.clientId,
        clientSecret: env.spotify.clientSecret,
        redirectUri: env.spotify.redirectUri,
        ...options
    });
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for rate limit to reset if needed
 */
async function waitForRateLimit() {
    if (rateLimitReset && Date.now() < rateLimitReset) {
        const waitTime = rateLimitReset - Date.now() + 100;
        console.log(`Spotify rate limited. Waiting ${waitTime}ms...`);
        await sleep(waitTime);
    }
}

/**
 * Handle Spotify API response with rate limit detection
 */
async function withRateLimitHandling(apiCall, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await waitForRateLimit();
            return await apiCall();
        } catch (error) {
            const status = error.statusCode || error.response?.status;

            if (status === 429) {
                const retryAfter = parseInt(
                    error.headers?.['retry-after'] ||
                    error.response?.headers?.['retry-after'] ||
                    '1',
                    10
                );
                rateLimitReset = Date.now() + (retryAfter * 1000);
                console.warn(`Spotify 429: Rate limited. Retry-After: ${retryAfter}s`);

                if (attempt < maxRetries) {
                    await sleep(retryAfter * 1000 + 100);
                    continue;
                }
            }

            if (status === 503 && attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 1000;
                console.warn(`Spotify 503: Service unavailable. Retrying in ${backoff}ms...`);
                await sleep(backoff);
                continue;
            }

            throw error;
        }
    }
}

// ============================================
// TOKEN EXCHANGE & USER PROFILE
// ============================================

/**
 * Exchange authorization code for tokens (PKCE flow)
 */
async function exchangeCodeForTokens(code, codeVerifier) {
    return withRateLimitHandling(async () => {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: env.spotify.redirectUri,
                client_id: env.spotify.clientId,
                code_verifier: codeVerifier
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in
        };
    });
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken) {
    return withRateLimitHandling(async () => {
        const spotifyApi = createSpotifyApi();
        spotifyApi.setRefreshToken(refreshToken);

        const response = await spotifyApi.refreshAccessToken();

        return {
            accessToken: response.body.access_token,
            refreshToken: response.body.refresh_token || refreshToken,
            expiresIn: response.body.expires_in
        };
    });
}

/**
 * Get user profile from Spotify
 */
async function getUserProfile(accessToken) {
    return withRateLimitHandling(async () => {
        const spotifyApi = createSpotifyApi({ accessToken });
        const response = await spotifyApi.getMe();

        return {
            spotifyId: response.body.id,
            email: response.body.email,
            displayName: response.body.display_name,
            avatarUrl: response.body.images?.[0]?.url || null,
            country: response.body.country
        };
    });
}

// ============================================
// CACHED API CALLS
// ============================================

/**
 * Check cache for top items
 * @returns {object|null} Cached data or null if cache miss/expired
 */
async function getCachedTopItems(userId, type, term) {
    try {
        const cached = await prisma.cachedTopItems.findUnique({
            where: {
                userId_type_term: { userId, type, term }
            }
        });

        if (!cached) return null;

        // Check if cache is still valid (24h TTL)
        const age = Date.now() - cached.updatedAt.getTime();
        if (age > CACHE_TTL) {
            return null; // Cache expired
        }

        return cached.data;
    } catch (error) {
        console.error('Cache read error:', error.message);
        return null;
    }
}

/**
 * Save items to cache
 */
async function setCachedTopItems(userId, type, term, data) {
    try {
        await prisma.cachedTopItems.upsert({
            where: {
                userId_type_term: { userId, type, term }
            },
            update: { data },
            create: { userId, type, term, data }
        });
    } catch (error) {
        console.error('Cache write error:', error.message);
    }
}

/**
 * Clear user's cache
 */
async function clearCache(userId) {
    try {
        await prisma.cachedTopItems.deleteMany({
            where: { userId }
        });
        return true;
    } catch (error) {
        console.error('Cache clear error:', error.message);
        return false;
    }
}

/**
 * Get user's top artists with caching
 * Now always caches with limit=50 to avoid partial cache issues
 */
async function getTopArtists(accessToken, userId, options = {}) {
    const term = options.time_range || 'medium_term';
    const requestedLimit = options.limit || 20;

    // Check cache first - cache stores up to 50 items
    const cached = await getCachedTopItems(userId, 'artists', term);
    if (cached && cached.items && cached.items.length >= requestedLimit) {
        console.log(`Cache HIT: top artists (${term}), returning ${requestedLimit} of ${cached.items.length} cached`);
        // Return sliced data
        return {
            body: { ...cached, items: cached.items.slice(0, requestedLimit) },
            fromCache: true
        };
    }

    // Cache miss or cached data is insufficient
    console.log(`Cache MISS or insufficient: top artists (${term}) - fetching from Spotify with limit=50`);

    // Always fetch max (50) to cache for future requests with different limits
    const result = await withRateLimitHandling(async () => {
        const spotifyApi = createSpotifyApi({ accessToken });
        return spotifyApi.getMyTopArtists({ time_range: term, limit: 50 });
    });

    // Save full result to cache
    await setCachedTopItems(userId, 'artists', term, result.body);

    // Return only requested amount
    return {
        body: { ...result.body, items: (result.body.items || []).slice(0, requestedLimit) },
        fromCache: false
    };
}


/**
 * Get user's top tracks with caching
 * Now always caches with limit=50 to avoid partial cache issues
 */
async function getTopTracks(accessToken, userId, options = {}) {
    const term = options.time_range || 'medium_term';
    const requestedLimit = options.limit || 20;

    // Check cache first - cache stores up to 50 items
    const cached = await getCachedTopItems(userId, 'tracks', term);
    if (cached && cached.items && cached.items.length >= requestedLimit) {
        console.log(`Cache HIT: top tracks (${term}), returning ${requestedLimit} of ${cached.items.length} cached`);
        // Return sliced data
        return {
            body: { ...cached, items: cached.items.slice(0, requestedLimit) },
            fromCache: true
        };
    }

    // Cache miss or cached data is insufficient
    console.log(`Cache MISS or insufficient: top tracks (${term}) - fetching from Spotify with limit=50`);

    // Always fetch max (50) to cache for future requests with different limits
    const result = await withRateLimitHandling(async () => {
        const spotifyApi = createSpotifyApi({ accessToken });
        return spotifyApi.getMyTopTracks({ time_range: term, limit: 50 });
    });

    // Save full result to cache
    await setCachedTopItems(userId, 'tracks', term, result.body);

    // Return only requested amount
    return {
        body: { ...result.body, items: (result.body.items || []).slice(0, requestedLimit) },
        fromCache: false
    };
}

/**
 * Derive top albums from top tracks
 */
async function getTopAlbums(accessToken, userId, options = {}) {
    const term = options.time_range || 'medium_term';

    // Check cache first
    const cached = await getCachedTopItems(userId, 'albums', term);
    if (cached) {
        console.log(`Cache HIT: top albums (${term})`);
        return { body: cached, fromCache: true };
    }

    // Get top tracks first
    const tracks = await getTopTracks(accessToken, userId, { time_range: term, limit: 50 });

    // Extract unique albums
    const albumMap = new Map();
    for (const track of tracks.body.items || []) {
        const album = track.album;
        if (album && !albumMap.has(album.id)) {
            albumMap.set(album.id, {
                id: album.id,
                name: album.name,
                artists: album.artists,
                images: album.images,
                release_date: album.release_date,
                total_tracks: album.total_tracks,
                trackCount: 1 // Count of top tracks from this album
            });
        } else if (album && albumMap.has(album.id)) {
            albumMap.get(album.id).trackCount++;
        }
    }

    // Sort by track count (albums with more top tracks first)
    const albums = Array.from(albumMap.values())
        .sort((a, b) => b.trackCount - a.trackCount)
        .slice(0, options.limit || 20);

    const result = { items: albums, total: albums.length };

    // Save to cache
    await setCachedTopItems(userId, 'albums', term, result);

    return { body: result, fromCache: false };
}

/**
 * Get audio features for multiple tracks
 * @param {string} accessToken - Spotify access token
 * @param {string[]} trackIds - Array of Spotify track IDs (max 100)
 * @returns {object} Audio features for each track
 */
async function getAudioFeatures(accessToken, trackIds) {
    if (!trackIds || trackIds.length === 0) {
        return { body: { audio_features: [] } };
    }

    // Spotify API allows max 100 tracks per request
    const limitedIds = trackIds.slice(0, 100);

    return withRateLimitHandling(async () => {
        const spotifyApi = createSpotifyApi({ accessToken });
        const response = await spotifyApi.getAudioFeaturesForTracks(limitedIds);
        return response;
    });
}

/**
 * Get user's recently played tracks (no caching - always fresh)
 */
async function getRecentlyPlayed(accessToken, options = {}) {
    return withRateLimitHandling(async () => {
        const spotifyApi = createSpotifyApi({ accessToken });
        return spotifyApi.getMyRecentlyPlayedTracks(options);
    });
}

module.exports = {
    createSpotifyApi,
    exchangeCodeForTokens,
    refreshAccessToken,
    getUserProfile,
    getTopArtists,
    getTopTracks,
    getTopAlbums,
    getAudioFeatures,
    getRecentlyPlayed,
    clearCache,
    withRateLimitHandling,
    CACHE_TTL
};
