/**
 * Authentication Controller
 * Handles OAuth2 + PKCE flow with Spotify
 *
 * Token Strategy:
 * - accessToken: Stored in session JWT cookie (short-lived, ~1h)
 * - refreshToken: Stored encrypted in database (long-lived, rotated on use)
 *
 * Security Features:
 * - Refresh token rotation with reuse detection
 * - Server-side logout (invalidates refresh token)
 * - Token version tracking for session invalidation
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const { SCOPES_STRING } = require('../config/spotify');
const { createPKCEState, extractVerifierFromState } = require('../services/pkceService');
const { exchangeCodeForTokens, getUserProfile, refreshAccessToken } = require('../services/spotifyService');
const { encrypt, decrypt } = require('../services/encryptionService');
const prisma = require('../utils/prismaClient');

// SEC-003: Short-lived auth codes for cross-domain token exchange
// Map<code, { jwtToken, cookieOptions, createdAt }>
const authCodes = new Map();
const AUTH_CODE_TTL = 30 * 1000; // 30 seconds

// Cleanup expired codes every 60s
setInterval(() => {
    const now = Date.now();
    for (const [code, data] of authCodes) {
        if (now - data.createdAt > AUTH_CODE_TTL) authCodes.delete(code);
    }
}, 60 * 1000);

// Cookie options for JWT
const getCookieOptions = () => ({
    httpOnly: true,
    // Ensure secure is false for http://127.0.0.1
    secure: env.isProduction,
    // Always Lax for OAuth flow to work without strict cross-site block
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

/**
 * Generate a unique token family ID for refresh token rotation
 */
function generateTokenFamily() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate JWT token containing user info AND Spotify access token
 * @param {Object} user - User object with id
 * @param {string} accessToken - Spotify access token
 * @param {Date} tokenExpiry - When the Spotify token expires
 * @param {string} tokenFamily - Token family for rotation detection
 * @returns {string} - Signed JWT
 */
// SEC-004: JWT no longer contains Spotify access token — stored server-side in DB
function generateJWT(user, tokenFamily) {
    return jwt.sign(
        {
            userId: user.id,
            spotifyId: user.spotifyId,
            tokenFamily: tokenFamily,
            tokenVersion: user.tokenVersion || 0
        },
        env.jwt.secret,
        { expiresIn: env.jwt.expiresIn }
    );
}

/**
 * GET /auth/login
 * Redirects to Spotify OAuth with PKCE challenge
 */
async function login(req, res) {
    try {
        const { state, codeChallenge } = createPKCEState();

        const params = new URLSearchParams({
            client_id: env.spotify.clientId,
            response_type: 'code',
            redirect_uri: env.spotify.redirectUri,
            scope: SCOPES_STRING,
            state: state,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge
        });

        const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
        res.redirect(authUrl);
    } catch (error) {
        console.error('Login error:', error);
        res.redirect(`${env.frontendUrl}/login?error=auth_failed`);
    }
}

/**
 * GET /auth/callback
 * Handles Spotify OAuth callback
 */
async function callback(req, res) {
    console.log('=== AUTH CALLBACK START ===');
    const { code, state, error } = req.query;

    if (error) {
        console.error('OAuth error:', error);
        // SEC-019: Encode error param to prevent injection
        return res.redirect(`${env.frontendUrl}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        console.error('Missing code or state');
        return res.redirect(`${env.frontendUrl}/login?error=missing_params`);
    }

    try {
        const codeVerifier = extractVerifierFromState(state);
        const tokens = await exchangeCodeForTokens(code, codeVerifier);

        const profile = await getUserProfile(tokens.accessToken);

        console.log('OAuth callback: user', profile.spotifyId);

        const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);

        // Generate new token family for this session
        const tokenFamily = generateTokenFamily();
        const encryptedRefreshToken = encrypt(tokens.refreshToken);

        // SEC-004: Store Spotify access token encrypted in DB (not in JWT)
        const encryptedAccessToken = encrypt(tokens.accessToken);

        // Upsert user with new token family (invalidates old sessions)
        const user = await prisma.user.upsert({
            where: { spotifyId: profile.spotifyId },
            update: {
                email: profile.email,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                country: profile.country,
                product: profile.product,
                refreshToken: encryptedRefreshToken,
                spotifyAccessToken: encryptedAccessToken,
                spotifyAccessTokenExpiry: tokenExpiry,
                tokenExpiry: tokenExpiry,
                tokenFamily: tokenFamily,
                tokenVersion: { increment: 1 }
            },
            create: {
                spotifyId: profile.spotifyId,
                email: profile.email,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                country: profile.country,
                product: profile.product,
                refreshToken: encryptedRefreshToken,
                spotifyAccessToken: encryptedAccessToken,
                spotifyAccessTokenExpiry: tokenExpiry,
                tokenExpiry: tokenExpiry,
                tokenFamily: tokenFamily,
                tokenVersion: 0
            }
        });

        const jwtToken = generateJWT(user, tokenFamily);
        const cookieOptions = getCookieOptions();
        res.cookie('jwt', jwtToken, cookieOptions);

        // SEC-003: Use short-lived auth code instead of JWT in URL.
        // JWT no longer exposed in URL bar, browser history, referrer headers, or server logs.
        const authCode = crypto.randomBytes(32).toString('hex');
        authCodes.set(authCode, { jwtToken, cookieOptions, createdAt: Date.now() });

        res.redirect(`${env.frontendUrl}/callback?code=${authCode}`);
    } catch (error) {
        console.error('Callback error:', error.message, error.stack);
        res.redirect(`${env.frontendUrl}/login?error=callback_failed`);
    }

}

/**
 * POST /auth/refresh
 * Refreshes the Spotify access token with rotation detection
 */
async function refresh(req, res, next) {
    try {
        const user = req.user;
        const jwtTokenFamily = req.tokenFamily;
        const jwtTokenVersion = req.tokenVersion;
        const currentTokenExpiry = req.spotifyTokenExpiry;

        // Token version check - detect stolen/old tokens
        if (jwtTokenVersion !== undefined && user.tokenVersion !== jwtTokenVersion) {
            // Token reuse detected! Invalidate all sessions
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    refreshToken: null,
                    tokenFamily: null,
                    tokenVersion: { increment: 1 }
                }
            });

            res.clearCookie('jwt', getCookieOptions());
            return res.status(401).json({
                error: 'TokenReuse',
                message: 'Security alert: Token reuse detected. Please log in again.'
            });
        }

        // Token family check - detect rotated token reuse
        if (jwtTokenFamily && user.tokenFamily !== jwtTokenFamily) {
            // Old token family used after rotation - potential theft
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    refreshToken: null,
                    tokenFamily: null,
                    tokenVersion: { increment: 1 }
                }
            });

            res.clearCookie('jwt', getCookieOptions());
            return res.status(401).json({
                error: 'TokenFamilyMismatch',
                message: 'Session invalidated. Please log in again.'
            });
        }

        // Check if token needs refresh
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        if (currentTokenExpiry && new Date(currentTokenExpiry) > fiveMinutesFromNow) {
            return res.json({
                message: 'Token is still valid',
                expiresAt: currentTokenExpiry
            });
        }

        // Fetch refreshToken from DB (protect middleware strips it from req.user for safety)
        const userWithToken = await prisma.user.findUnique({
            where: { id: user.id },
            select: { refreshToken: true }
        });

        if (!userWithToken?.refreshToken) {
            return res.status(401).json({
                error: 'NoRefreshToken',
                message: 'Session expired. Please log in again.'
            });
        }

        const decryptedRefreshToken = decrypt(userWithToken.refreshToken);
        const newTokens = await refreshAccessToken(decryptedRefreshToken);
        const tokenExpiry = new Date(Date.now() + newTokens.expiresIn * 1000);

        // ROTATION: Always generate new token family on refresh
        const newTokenFamily = generateTokenFamily();
        const encryptedNewRefresh = encrypt(newTokens.refreshToken || decryptedRefreshToken);
        // SEC-004: Store new access token encrypted in DB
        const encryptedNewAccess = encrypt(newTokens.accessToken);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                refreshToken: encryptedNewRefresh,
                spotifyAccessToken: encryptedNewAccess,
                spotifyAccessTokenExpiry: tokenExpiry,
                tokenExpiry: tokenExpiry,
                tokenFamily: newTokenFamily,
                tokenVersion: { increment: 1 }
            }
        });

        // Refetch user to get updated tokenVersion
        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { tokenVersion: true }
        });

        const jwtToken = generateJWT(
            { ...user, tokenVersion: updatedUser.tokenVersion },
            newTokenFamily
        );
        res.cookie('jwt', jwtToken, getCookieOptions());

        res.json({
            message: 'Token refreshed successfully',
            token: jwtToken,
            expiresAt: tokenExpiry
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/logout
 * Server-side logout: clears cookie AND invalidates refresh token in DB
 */
async function logout(req, res, next) {
    try {
        // Clear cookie first
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'Lax'
        });

        // If user is authenticated, invalidate their refresh token
        if (req.user?.id) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    refreshToken: null,
                    tokenFamily: null,
                    tokenVersion: { increment: 1 }
                }
            });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        // Even if DB update fails, cookie is cleared - log error but respond success
        console.error('Logout DB error:', error.message);
        res.json({ message: 'Logged out successfully' });
    }
}

/**
 * GET /auth/me
 * Returns the current authenticated user
 */
async function me(req, res) {
    let user = req.user;

    // Self-healing: Update product/subscription if missing
    if (!user.product) {
        try {
            // SEC-004: Read access token from DB (not JWT)
            const userTokens = await prisma.user.findUnique({
                where: { id: user.id },
                select: { spotifyAccessToken: true, spotifyAccessTokenExpiry: true }
            });
            const expiry = userTokens?.spotifyAccessTokenExpiry ? new Date(userTokens.spotifyAccessTokenExpiry).getTime() : 0;

            if (userTokens?.spotifyAccessToken && expiry > Date.now()) {
                const spotifyToken = decrypt(userTokens.spotifyAccessToken);
                const profile = await getUserProfile(spotifyToken);

                if (profile.product) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { product: profile.product, country: profile.country }
                    });
                }
            }
        } catch (err) {
            console.warn('[Auth] Failed to auto-update profile (non-critical):', err.message);
        }
    }

    res.json({
        user: {
            id: user.id,
            spotifyId: user.spotifyId,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            country: user.country,
            product: user.product
        }
    });
}

/**
 * DELETE /api/me
 * GDPR: Delete user account and all associated data
 */
async function deleteAccount(req, res, next) {
    try {
        const userId = req.user.id;

        // Use transaction to delete all user data atomically
        await prisma.$transaction([
            // Delete streaming history
            prisma.streamingHistory.deleteMany({
                where: { userId }
            }),
            // Delete import jobs
            prisma.import.deleteMany({
                where: { userId }
            }),
            // Delete user (cascade should handle relations, but explicit is safer)
            prisma.user.delete({
                where: { id: userId }
            })
        ]);

        // Clear cookie
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'Lax'
        });

        res.json({
            message: 'Account deleted successfully',
            deletedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Delete account error:', error.message);
        next(error);
    }
}

/**
 * POST /auth/exchange
 * SEC-003: Exchange short-lived auth code for JWT token
 * Code is single-use, expires in 30 seconds
 */
async function exchange(req, res) {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            error: 'MissingCode',
            message: 'Authorization code is required'
        });
    }

    const authData = authCodes.get(code);

    if (!authData) {
        return res.status(401).json({
            error: 'InvalidCode',
            message: 'Authorization code is invalid or expired'
        });
    }

    // Single-use: delete immediately
    authCodes.delete(code);

    // Check TTL
    if (Date.now() - authData.createdAt > AUTH_CODE_TTL) {
        return res.status(401).json({
            error: 'ExpiredCode',
            message: 'Authorization code has expired'
        });
    }

    // Set cookie and return token
    res.cookie('jwt', authData.jwtToken, authData.cookieOptions);
    res.json({ token: authData.jwtToken });
}

module.exports = {
    login,
    callback,
    refresh,
    logout,
    me,
    deleteAccount,
    exchange
};
