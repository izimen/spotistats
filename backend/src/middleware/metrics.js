/**
 * Prometheus Metrics Middleware
 * Exposes HTTP metrics for monitoring
 */

// Check if prom-client is available
let client;
let collectDefaultMetrics;
let httpRequestDurationMicroseconds;
let httpRequestsTotal;
let httpActiveRequests;

try {
    client = require('prom-client');
    collectDefaultMetrics = client.collectDefaultMetrics;

    // Collect default metrics (memory, CPU, etc.)
    collectDefaultMetrics({ prefix: 'spotistats_' });

    // Custom metrics
    httpRequestDurationMicroseconds = new client.Histogram({
        name: 'spotistats_http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    });

    httpRequestsTotal = new client.Counter({
        name: 'spotistats_http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code']
    });

    httpActiveRequests = new client.Gauge({
        name: 'spotistats_http_active_requests',
        help: 'Number of active HTTP requests'
    });

    console.log('[Metrics] Prometheus metrics initialized');
} catch (error) {
    console.warn('[Metrics] prom-client not installed, metrics disabled:', error.message);
}

/**
 * Middleware to track request metrics
 */
function metricsMiddleware(req, res, next) {
    if (!client) {
        return next();
    }

    const start = process.hrtime();
    httpActiveRequests.inc();

    // Get route pattern (not specific URL with params)
    const route = req.route?.path || req.path || 'unknown';

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationSeconds = duration[0] + duration[1] / 1e9;

        const labels = {
            method: req.method,
            route: route.replace(/\/[a-f0-9-]{24,}/g, '/:id'), // Normalize IDs
            status_code: res.statusCode
        };

        httpRequestDurationMicroseconds.observe(labels, durationSeconds);
        httpRequestsTotal.inc(labels);
        httpActiveRequests.dec();
    });

    next();
}

/**
 * Endpoint to expose metrics for Prometheus scraping
 */
async function metricsEndpoint(req, res) {
    if (!client) {
        return res.status(503).json({ error: 'Metrics not available' });
    }

    try {
        res.set('Content-Type', client.register.contentType);
        const metrics = await client.register.metrics();
        res.end(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to collect metrics' });
    }
}

module.exports = {
    metricsMiddleware,
    metricsEndpoint
};
