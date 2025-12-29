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

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    // Default values
    let statusCode = err.statusCode || 500;
    let errorCode = err.errorCode || 'ServerError';
    let message = err.message || 'An unexpected error occurred';

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
        console.error(`[${errorCode}] ${message}`);
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


    // Send error response
    res.status(statusCode).json({
        error: errorCode,
        message: env.isProduction && statusCode === 500
            ? 'An unexpected error occurred'
            : message,
        ...(env.isProduction ? {} : { stack: err.stack })
    });
}

module.exports = {
    AppError,
    notFoundHandler,
    errorHandler
};
