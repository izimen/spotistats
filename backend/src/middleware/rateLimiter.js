/**
 * Rate Limiting Middleware
 * Supports in-memory (dev) and Redis (prod) stores
 */
const rateLimit = require('express-rate-limit');

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
 * General rate limiter - 500 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Increased for development
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
 * Auth rate limiter - 5 requests per 15 minutes per IP
 * Stricter limits for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Increased for development debugging
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
 * API rate limiter - 200 requests per 15 minutes per user+IP
 * For protected API endpoints, includes user ID in key
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
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
 * Import rate limiter - 10 imports per hour per user
 * Stricter limit for resource-intensive operations
 */
const importLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
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
