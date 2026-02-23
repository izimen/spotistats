/**
 * GCP Cloud Scheduler Authentication Middleware
 *
 * Accepts requests if ANY of the following conditions are met:
 * 1. Authorization: Bearer <CRON_SECRET_KEY>
 * 2. In development mode (bypass)
 *
 * SECURITY: X-Cloudscheduler header was removed — it's trivially spoofable
 * by any client and provides no real authentication.
 */
const env = require('../config/env');

function cronAuth(req, res, next) {
    // Method 1: Secret key in Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && env.cronSecretKey) {
        const token = authHeader.replace('Bearer ', '');
        if (token === env.cronSecretKey) {
            console.log('[CronAuth] Authorized via secret key');
            return next();
        }
    }

    // Method 2: Development bypass
    if (!env.isProduction) {
        console.warn('[CronAuth] DEV MODE: Allowing request without auth');
        return next();
    }

    // Unauthorized
    console.error('[CronAuth] Unauthorized cron request');
    return res.status(401).json({
        success: false,
        error: 'Unauthorized cron request'
    });
}

module.exports = { cronAuth };
