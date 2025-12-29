/**
 * Authentication Middleware
 * Verifies JWT and attaches user to request
 *
 * Token Strategy:
 * - accessToken: Stored in JWT cookie (not in DB, short-lived ~1h)
 * - refreshToken: Stored encrypted in DB (long-lived)
 * - tokenVersion: Validates JWT against DB version
 * - tokenFamily: Detects refresh token rotation reuse
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../utils/prismaClient');

/**
 * Protect middleware - requires valid JWT
 * Extracts Spotify accessToken and validates token version
 */
async function protect(req, res, next) {
    try {
        // Try cookie first, then Authorization header (for cross-origin dev environment)
        let token = req.cookies.jwt;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Please log in to access this resource'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'TokenExpired',
                    message: 'Your session has expired. Please log in again.'
                });
            }
            return res.status(401).json({
                error: 'InvalidToken',
                message: 'Invalid authentication token'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            res.clearCookie('jwt');
            return res.status(401).json({
                error: 'UserNotFound',
                message: 'User no longer exists'
            });
        }

        // If user has no refresh token, force re-login
        if (!user.refreshToken) {
            res.clearCookie('jwt');
            return res.status(401).json({
                error: 'NoRefreshToken',
                message: 'Session expired. Please log in again.'
            });
        }

        // Token version check - detect invalidated sessions
        if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
            res.clearCookie('jwt');
            return res.status(401).json({
                error: 'SessionInvalidated',
                message: 'Session has been invalidated. Please log in again.'
            });
        }

        // Attach to request
        req.user = user;
        req.spotifyAccessToken = decoded.spotifyAccessToken;
        req.spotifyTokenExpiry = decoded.spotifyTokenExpiry;
        req.tokenFamily = decoded.tokenFamily;
        req.tokenVersion = decoded.tokenVersion;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.clearCookie('jwt');
        return res.status(500).json({
            error: 'ServerError',
            message: 'Authentication failed'
        });
    }
}


/**
 * Optional auth - doesn't fail if no token present
 */
async function optionalAuth(req, res, next) {
    try {
        // Try cookie first, then Authorization header
        let token = req.cookies.jwt;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (user && decoded.tokenVersion === user.tokenVersion) {
            req.user = user;
            req.spotifyAccessToken = decoded.spotifyAccessToken;
            req.spotifyTokenExpiry = decoded.spotifyTokenExpiry;
            req.tokenFamily = decoded.tokenFamily;
            req.tokenVersion = decoded.tokenVersion;
        }

        next();
    } catch (error) {
        // Token invalid but that's okay, continue without user
        next();
    }
}

module.exports = { protect, optionalAuth };
