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
function generateJWT(user, accessToken, tokenExpiry, tokenFamily) {
    return jwt.sign(
        {
            userId: user.id,
            spotifyId: user.spotifyId,
            spotifyAccessToken: accessToken,
            spotifyTokenExpiry: tokenExpiry.toISOString(),
            tokenFamily: tokenFamily, // For rotation detection
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
        return res.redirect(`${env.frontendUrl}/login?error=${error}`);
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

        // Upsert user with new token family (invalidates old sessions)
        await prisma.user.upsert({
            where: { spotifyId: profile.spotifyId },
            update: {
                email: profile.email,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                country: profile.country,
                product: profile.product,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: tokenExpiry,
                tokenFamily: tokenFamily,
                tokenVersion: { increment: 1 } // Invalidate old JWTs
            },
            create: {
                spotifyId: profile.spotifyId,
                email: profile.email,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                country: profile.country,
                product: profile.product,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: tokenExpiry,
                tokenFamily: tokenFamily,
                tokenVersion: 0
            }
        });

        const user = await prisma.user.findUnique({
            where: { spotifyId: profile.spotifyId }
        });

        const jwtToken = generateJWT(user, tokens.accessToken, tokenExpiry, tokenFamily);
        const cookieOptions = getCookieOptions();
        res.cookie('jwt', jwtToken, cookieOptions);

        // Redirect to frontend
        res.redirect(`${env.frontendUrl}/callback?token=${encodeURIComponent(jwtToken)}`);
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

        // Check if user has refresh token
        if (!user.refreshToken) {
            return res.status(401).json({
                error: 'NoRefreshToken',
                message: 'Session expired. Please log in again.'
            });
        }

        const decryptedRefreshToken = decrypt(user.refreshToken);
        const newTokens = await refreshAccessToken(decryptedRefreshToken);
        const tokenExpiry = new Date(Date.now() + newTokens.expiresIn * 1000);

        // ROTATION: Always generate new token family on refresh
        const newTokenFamily = generateTokenFamily();
        const encryptedNewRefresh = encrypt(newTokens.refreshToken || decryptedRefreshToken);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                refreshToken: encryptedNewRefresh,
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
            newTokens.accessToken,
            tokenExpiry,
            newTokenFamily
        );
        res.cookie('jwt', jwtToken, getCookieOptions());

        res.json({
            message: 'Token refreshed successfully',
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
            sameSite: env.isProduction ? 'strict' : 'lax'
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
    const user = req.user;

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
            sameSite: env.isProduction ? 'strict' : 'lax'
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

module.exports = {
    login,
    callback,
    refresh,
    logout,
    me,
    deleteAccount
};
