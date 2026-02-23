/**
 * Cron Routes
 * Endpoints for GCP Cloud Scheduler and cron job management
 */
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { cronAuth } = require('../middleware/cronAuth');
const { protect } = require('../middleware/protect');
const cronController = require('../controllers/cronController');
const { createStore, createKeyGenerator } = require('../middleware/rateLimiter');

// Rate limiter for cron endpoint: max 1 request per minute
const cronLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1,
    message: {
        success: false,
        error: 'Too many cron requests, please wait before retrying'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('cron'), // Use Redis with 'cron' prefix
    keyGenerator: createKeyGenerator(false), // Use IP (now correct thanks to trust proxy)
    // Skip rate limiting in development for easier testing
    skip: (req) => process.env.NODE_ENV !== 'production'
});

// ============================================
// Public Endpoints (with auth)
// ============================================

// Health check (no auth required)
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'cron'
    });
});

// Sync listening history - called by GCP Cloud Scheduler
// Protected by cronAuth middleware (Bearer secret key only, no spoofable headers)
router.post('/sync-listening-history',
    cronLimiter,
    cronAuth,
    cronController.syncListeningHistory
);

// Cleanup old data - called by GCP Cloud Scheduler weekly
// Removes CachedTopItems > 30 days and orphaned stats
router.post('/cleanup',
    cronLimiter,
    cronAuth,
    cronController.cleanupOldData
);

// ============================================
// Authenticated Endpoints (user auth required)
// ============================================

// Get cron job status (requires logged-in user)
router.get('/status', protect, cronController.getStatus);

module.exports = router;
