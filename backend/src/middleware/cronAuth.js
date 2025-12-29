/**
 * GCP Cloud Scheduler Authentication Middleware
 *
 * Accepts requests if ANY of the following conditions are met:
 * 1. Header X-Cloudscheduler: true (from GCP)
 * 2. Authorization: Bearer <CRON_SECRET_KEY>
 * 3. In development mode (bypass)
 */
const env = require('../config/env');

function cronAuth(req, res, next) {
    // Method 1: GCP Cloud Scheduler header
    if (req.headers['x-cloudscheduler'] === 'true') {
        console.log('[CronAuth] Authorized via X-Cloudscheduler header');
        return next();
    }

    // Method 2: Secret key in Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && env.cronSecretKey) {
        const token = authHeader.replace('Bearer ', '');
        if (token === env.cronSecretKey) {
            console.log('[CronAuth] Authorized via secret key');
            return next();
        }
    }

    // Method 3: Development bypass
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
