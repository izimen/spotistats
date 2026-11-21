/**
 * Token Service
 * Single place that hands out a valid Spotify access token for a user.
 *
 * - Reuses the stored (encrypted) access token while it is valid (5 min buffer)
 * - Refreshes it otherwise, with a per-user in-process lock
 * - Persists the refresh token Spotify returns (PKCE refresh tokens rotate - keeping the
 *   old one leads to invalid_grant and the user silently stops being collected)
 * - Uses a conditional update so two instances refreshing at once don't overwrite
 *   a newer refresh token with an older one
 * - Clears the Spotify grant ONLY on a real `invalid_grant` from Spotify
 */
const prisma = require('../utils/prismaClient');
const spotifyService = require('./spotifyService');
const encryptionService = require('./encryptionService');

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/** userId -> { token, expiresAt } (per instance, decrypted) */
const accessTokenCache = new Map();
/** userId -> Promise<string> */
const refreshLocks = new Map();

function isInvalidGrant(err) {
    return err?.body?.error === 'invalid_grant' || err?.response?.data?.error === 'invalid_grant';
}

function isQuotaOrRateLimit(err) {
    const status = err?.statusCode || err?.response?.status;
    return status === 429;
}

function remember(userId, token, expiresAt) {
    accessTokenCache.set(userId, { token, expiresAt });
}

function forget(userId) {
    accessTokenCache.delete(userId);
}

function tokenError(message, code) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = 401;
    return error;
}

/**
 * Refresh the Spotify access token and persist the result.
 * @returns {Promise<string>} access token
 */
async function doRefresh(userId) {
    const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { refreshToken: true },
    });

    if (!row?.refreshToken) {
        throw tokenError('No refresh token available. Please log in again.', 'NO_REFRESH_TOKEN');
    }

    const readCiphertext = row.refreshToken;
    let tokens;
    try {
        tokens = await spotifyService.refreshAccessToken(encryptionService.decrypt(readCiphertext));
    } catch (err) {
        forget(userId);
        if (isInvalidGrant(err)) {
            // Only clear if nobody stored a newer refresh token meanwhile
            const { count } = await prisma.user.updateMany({
                where: { id: userId, refreshToken: readCiphertext },
                data: {
                    refreshToken: null,
                    spotifyAccessToken: null,
                    spotifyAccessTokenExpiry: null,
                    spotifyGrantRevokedAt: new Date(),
                },
            });
            if (count === 0) {
                // Another request rotated the token first - use its result
                return useStoredAccessToken(userId, true);
            }
            console.warn(JSON.stringify({
                severity: 'WARNING',
                message: 'spotify_grant_revoked',
                component: 'token-service',
                userId: userId.substring(0, 8),
                reason: err.body?.error_description || 'invalid_grant',
            }));
            throw tokenError('Spotify access was revoked. Please log in again.', 'REFRESH_TOKEN_REVOKED');
        }
        throw err;
    }

    const expiresAt = Date.now() + (tokens.expiresIn || 3600) * 1000;
    const data = {
        spotifyAccessToken: encryptionService.encrypt(tokens.accessToken),
        spotifyAccessTokenExpiry: new Date(expiresAt),
        tokenExpiry: new Date(expiresAt),
    };
    if (tokens.refreshToken) {
        data.refreshToken = encryptionService.encrypt(tokens.refreshToken);
    }

    const { count } = await prisma.user.updateMany({
        where: { id: userId, refreshToken: readCiphertext },
        data,
    });

    if (count === 0) {
        // Lost the race: another instance already stored newer tokens. Its access
        // token is valid too, but prefer the stored one to stay consistent.
        const stored = await useStoredAccessToken(userId, false);
        if (stored) return stored;
    }

    remember(userId, tokens.accessToken, expiresAt);
    return tokens.accessToken;
}

/**
 * Return the stored access token if it is still valid, else null (or throw when required).
 */
async function useStoredAccessToken(userId, required) {
    const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { spotifyAccessToken: true, spotifyAccessTokenExpiry: true },
    });
    if (row?.spotifyAccessToken && row?.spotifyAccessTokenExpiry) {
        const expiresAt = new Date(row.spotifyAccessTokenExpiry).getTime();
        if (expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
            const token = encryptionService.decrypt(row.spotifyAccessToken);
            remember(userId, token, expiresAt);
            return token;
        }
    }
    if (required) {
        throw tokenError('No valid Spotify token. Please log in again.', 'NO_REFRESH_TOKEN');
    }
    return null;
}

/**
 * Get a valid Spotify access token for a user (cache -> DB -> refresh).
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getValidAccessToken(userId) {
    const cached = accessTokenCache.get(userId);
    if (cached && cached.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
        return cached.token;
    }
    forget(userId);

    const stored = await useStoredAccessToken(userId, false);
    if (stored) return stored;

    if (refreshLocks.has(userId)) {
        return refreshLocks.get(userId);
    }

    const promise = doRefresh(userId);
    refreshLocks.set(userId, promise);
    try {
        return await promise;
    } finally {
        refreshLocks.delete(userId);
    }
}

module.exports = {
    getValidAccessToken,
    forget,
    isInvalidGrant,
    isQuotaOrRateLimit,
    TOKEN_EXPIRY_BUFFER_MS,
    _internal: { accessTokenCache, refreshLocks },
};
