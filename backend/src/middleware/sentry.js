/**
 * Sentry Error Monitoring Integration
 * Provides centralized error tracking and performance monitoring
 */

// Check if Sentry is available
let Sentry;
let isInitialized = false;

try {
    Sentry = require('@sentry/node');

    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
        Sentry.init({
            dsn: dsn,
            environment: process.env.NODE_ENV || 'development',
            release: process.env.npm_package_version || '1.0.0',

            // Performance monitoring
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Filter out non-error events we don't want
            beforeSend(event, hint) {
                // Don't send 4xx errors (expected user errors)
                const statusCode = event?.contexts?.response?.status_code;
                if (statusCode >= 400 && statusCode < 500) {
                    return null;
                }
                return event;
            },

            // Scrub sensitive data
            beforeSendTransaction(event) {
                // Remove sensitive headers
                if (event.request?.headers) {
                    delete event.request.headers.authorization;
                    delete event.request.headers.cookie;
                }
                return event;
            }
        });

        isInitialized = true;
        console.log('[Sentry] Initialized with DSN');
    } else {
        console.warn('[Sentry] No SENTRY_DSN configured, error tracking disabled');
    }
} catch (error) {
    console.warn('[Sentry] @sentry/node not installed, error tracking disabled:', error.message);
}

/**
 * Request handler - adds Sentry context to each request
 */
function sentryRequestHandler(req, res, next) {
    if (!isInitialized) {
        return next();
    }

    Sentry.withScope((scope) => {
        // Add user context if available
        if (req.user) {
            scope.setUser({
                id: req.user.id,
                email: req.user.email,
                spotifyId: req.user.spotifyId
            });
        }

        // Add request context
        scope.setTag('route', req.route?.path || req.path);
        scope.setTag('method', req.method);

        next();
    });
}

/**
 * Error handler - captures unhandled errors to Sentry
 */
function sentryErrorHandler(error, req, res, next) {
    if (!isInitialized) {
        return next(error);
    }

    Sentry.withScope((scope) => {
        scope.setExtra('url', req.url);
        scope.setExtra('method', req.method);
        scope.setExtra('body', req.body);
        scope.setExtra('query', req.query);

        Sentry.captureException(error);
    });

    next(error);
}

/**
 * Manually capture an error
 */
function captureError(error, context = {}) {
    if (!isInitialized) {
        console.error('[Sentry] Would capture:', error.message);
        return;
    }

    Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
        });
        Sentry.captureException(error);
    });
}

/**
 * Manually capture a message
 */
function captureMessage(message, level = 'info', context = {}) {
    if (!isInitialized) {
        console.log(`[Sentry] Would capture (${level}):`, message);
        return;
    }

    Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
        });
        Sentry.captureMessage(message, level);
    });
}

module.exports = {
    sentryRequestHandler,
    sentryErrorHandler,
    captureError,
    captureMessage,
    isInitialized: () => isInitialized
};
