/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */
const env = require('../config/env');

/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'ServerError') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Not found handler - 404 for unknown routes
 */
function notFoundHandler(req, res, next) {
    const error = new AppError(
        `Cannot ${req.method} ${req.originalUrl}`,
        404,
        'NotFound'
    );
    next(error);
}

// Prisma codes for "database cannot be reached / authenticated / pool exhausted"
const DB_UNAVAILABLE_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

/**
 * True when the error means the database is unreachable (e.g. a paused Supabase project),
 * as opposed to a bug in a query.
 */
function isDatabaseUnavailableError(err) {
    if (!err) return false;
    if (err.name === 'PrismaClientInitializationError') return true;
    if (DB_UNAVAILABLE_CODES.has(err.code) || DB_UNAVAILABLE_CODES.has(err.errorCode)) return true;
    return typeof err.message === 'string' &&
        /Can't reach database server|tenant\/user .* not found|Error querying the database: FATAL/i.test(err.message);
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    // Default values
    let statusCode = err.statusCode || 500;
    let errorCode = err.errorCode || 'ServerError';
    let message = err.message || 'An unexpected error occurred';
    let isOperational = err.isOperational;

    // CORS rejection from the cors() origin callback - a client error, not a server fault
    if (err.message === 'Not allowed by CORS') {
        statusCode = 403;
        errorCode = 'CorsForbidden';
        message = 'Origin not allowed';
        isOperational = true;
    }

    if (isDatabaseUnavailableError(err)) {
        statusCode = 503;
        errorCode = 'DatabaseUnavailable';
        message = 'Database temporarily unavailable. Please try again later.';
        isOperational = true;
        res.set('Retry-After', '60');
    }

    // Log error in development
    if (!env.isProduction) {
        console.error('Error:', {
            message: err.message,
            stack: err.stack,
            statusCode,
            errorCode
        });
    } else {
        // Log only essential info in production
        console.error(`[${errorCode}] ${message} | Method: ${req.method} | URL: ${req.originalUrl} | IP: ${req.ip}`);
    }

    // Handle specific error types
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = 'InvalidToken';
        message = 'Invalid authentication token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TokenExpired';
        message = 'Authentication token has expired';
    }

    if (err.code === 'P2002') {
        // Prisma unique constraint violation
        statusCode = 409;
        errorCode = 'DuplicateEntry';
        message = 'A record with this value already exists';
    }

    if (err.code === 'P2025') {
        // Prisma record not found
        statusCode = 404;
        errorCode = 'NotFound';
        message = 'Record not found';
    }

    // Handle Spotify refresh token errors
    if (err.code === 'NO_REFRESH_TOKEN' || err.code === 'REFRESH_TOKEN_REVOKED') {
        statusCode = 401;
        errorCode = err.code;
        message = err.message;
    }

    // Handle Spotify API errors
    if (err.message?.includes('invalid_grant') || err.message?.includes('revoked')) {
        statusCode = 401;
        errorCode = 'SpotifyAuthError';
        message = 'Spotify session expired. Please log in again.';
    }


    // Send error response in RFC 7807 Problem Details format
    // See: https://datatracker.ietf.org/doc/html/rfc7807
    res.status(statusCode);
    res.set('Content-Type', 'application/problem+json');
    res.json({
        type: `https://spotistats.app/problems/${errorCode.toLowerCase().replace(/_/g, '-')}`,
        title: errorCode.replace(/([A-Z])/g, ' $1').trim(), // CamelCase -> Title Case
        status: statusCode,
        // SECURITY FIX: In production, hide internal error details for non-operational errors
        detail: env.isProduction && !isOperational
            ? 'An unexpected error occurred'
            : message,
        instance: req.originalUrl,
        ...(env.isProduction ? {} : { stack: err.stack })
    });
}

module.exports = {
    AppError,
    notFoundHandler,
    errorHandler,
    isDatabaseUnavailableError
};
