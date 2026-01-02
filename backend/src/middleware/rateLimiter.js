/**
 * Rate Limiting Middleware
 * Supports in-memory (dev) and Redis (prod) stores
 */
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Conditionally import Redis store
let RedisStore;
let redis;
try {
    RedisStore = require('rate-limit-redis').default;
    const Redis = require('ioredis');

    // Only create Redis client if REDIS_URL is configured
    if (process.env.REDIS_URL) {
        redis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: false
        });

        redis.on('error', (err) => {
            console.error('Redis connection error:', err.message);
        });

        redis.on('connect', () => {
            console.log('Redis connected for rate limiting');
        });
    }
} catch (e) {
    console.warn('Redis not available for rate limiting, using memory store');
}

/**
 * Create rate limit store (Redis in prod, Memory in dev)
 */
function createStore(prefix) {
    if (redis && RedisStore) {
        return new RedisStore({
            sendCommand: (...args) => redis.call(...args),
            prefix: `rl:${prefix}:`
        });
    }
    // Fall back to memory store
    return undefined; // express-rate-limit uses memory by default
}

/**
 * Key generator - supports per-IP and optional per-user limiting
 */
function createKeyGenerator(includeUser = false) {
    return (req) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        if (includeUser && req.user?.id) {
            return `${req.user.id}:${ip}`;
        }

        return ip;
    };
}

/**
 * General rate limiter - configurable via RATE_LIMIT_GENERAL
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimits.general,
    message: {
        error: 'TooManyRequests',
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('general'),
    keyGenerator: createKeyGenerator(false)
});

/**
 * Auth rate limiter - configurable via RATE_LIMIT_AUTH
 * Stricter limits for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimits.auth,
    message: {
        error: 'TooManyAuthAttempts',
        message: 'Too many authentication attempts, please try again in 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('auth'),
    keyGenerator: createKeyGenerator(false)
});

/**
 * API rate limiter - configurable via RATE_LIMIT_API
 * For protected API endpoints, includes user ID in key
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimits.api,
    message: {
        error: 'TooManyRequests',
        message: 'API rate limit exceeded, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('api'),
    keyGenerator: createKeyGenerator(true) // Include user ID
});

/**
 * Import rate limiter - configurable via RATE_LIMIT_IMPORT
 * Stricter limit for resource-intensive operations
 */
const importLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: env.rateLimits.import,
    message: {
        error: 'TooManyImports',
        message: 'Too many import attempts, please try again in an hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('import'),
    keyGenerator: createKeyGenerator(true)
});

/**
 * Cleanup Redis connection on shutdown
 */
function closeRedis() {
    if (redis) {
        redis.disconnect();
    }
}

module.exports = {
    generalLimiter,
    authLimiter,
    apiLimiter,
    importLimiter,
    closeRedis
};
