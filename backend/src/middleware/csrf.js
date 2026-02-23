/**
 * Enhanced CSRF Protection Middleware
 * Uses Double Submit Cookie pattern for stronger protection
 *
 * Implementation:
 * 1. Generate random CSRF token on first request
 * 2. Store in httpOnly cookie AND return in response header
 * 3. Client must send token in X-CSRF-Token header
 * 4. Validate that header token matches cookie token
 *
 * This is stronger than X-Requested-With because:
 * - Uses cryptographic randomness
 * - Token is tied to session/browser
 * - Cannot be guessed or forged
 */
const crypto = require('crypto');
const env = require('../config/env');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
function generateToken() {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF Token Generation Middleware
 * Should be applied early in the middleware chain
 * Generates token if not present in cookies
 */
function csrfTokenGenerator(req, res, next) {
    // Check if token exists in cookies
    let token = req.cookies[CSRF_COOKIE_NAME];

    // Generate new token if not present
    if (!token) {
        token = generateToken();
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
    }

    // Attach token to request for use in responses
    req.csrfToken = token;

    // Also set in response header so client can read it (for SPAs)
    res.setHeader('X-CSRF-Token', token);

    next();
}

/**
 * CSRF Validation Middleware
 * Validates that the token in header matches the cookie
 * Only applies to state-changing methods (POST, PUT, DELETE, PATCH)
 */
function csrfProtection(req, res, next) {
    // Skip safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip specific paths if needed (webhooks, cron endpoints)
    const skipPaths = [
        '/api/v1/cron/' // Cron routes have their own auth (Bearer secret key)
    ];
    if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Get tokens
    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.get(CSRF_HEADER_NAME);

    // SECURITY FIX: Strict double-submit cookie validation only
    // Removed legacy X-Requested-With fallback (trivially spoofable)
    if (cookieToken && headerToken && cookieToken === headerToken) {
        return next();
    }

    // CSRF validation failed
    console.warn(`[CSRF] Validation failed: ${req.method} ${req.originalUrl} from ${req.ip}`);
    return res.status(403).json({
        error: 'CSRFValidationFailed',
        message: 'CSRF token validation failed. Please refresh the page and try again.'
    });
}

/**
 * Get CSRF token for embedding in forms or API responses
 * Use after csrfTokenGenerator middleware
 */
function getToken(req) {
    return req.csrfToken;
}

module.exports = {
    csrfTokenGenerator,
    csrfProtection,
    getToken,
    CSRF_HEADER_NAME
};
