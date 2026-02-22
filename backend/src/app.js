/**
 * Express Application Setup
 * Configures middleware and routes
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');
const { sentryRequestHandler, sentryErrorHandler } = require('./middleware/sentry');

// Import routes
const authRoutes = require('./routes/auth.routes');
const statsRoutes = require('./routes/stats.routes');
const importRoutes = require('./routes/import.routes');
const profileRoutes = require('./routes/profile.routes');
const cronRoutes = require('./routes/cron.routes');

// Create Express app
const app = express();

// Trust proxy - Required for Cloud Run / load balancers
// SECURITY FIX: Use 1 instead of true to only trust the first proxy hop
// 'true' trusts ALL X-Forwarded-For entries, allowing IP spoofing via nested proxies
app.set('trust proxy', 1);

// ===================
// Security Middleware
// ===================

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", env.frontendUrl],
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS - Only allow frontend origin
// SECURITY FIX: localhost origins only in development, production uses env.frontendUrl
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            env.frontendUrl,
            'https://spotistats-frontend-589662369162.europe-central2.run.app' // Cloud Run production
        ];

        // In development, also allow localhost variants
        if (!env.isProduction) {
            allowedOrigins.push(
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'http://localhost:8080',
                'http://127.0.0.1:8080'
            );
        }

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Rate limiting
app.use(generalLimiter);

// ===================
// Body Parsing (must be before CSRF)
// ===================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ===================
// CSRF Protection (Enhanced)
// ===================

// Import enhanced CSRF middleware with Double Submit Cookie pattern
const { csrfTokenGenerator, csrfProtection } = require('./middleware/csrf');

// Generate CSRF token for each session (stored in httpOnly cookie)
app.use(csrfTokenGenerator);

// Validate CSRF token on state-changing requests
// Supports both new Double Submit Cookie AND legacy X-Requested-With for backwards compatibility
app.use(csrfProtection);

// ===================
// Health Check & Metrics
// ===================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: env.nodeEnv
    });
});

// Prometheus metrics endpoint (no auth for scraping)
app.get('/metrics', metricsEndpoint);

// Apply metrics middleware to all routes below
app.use(metricsMiddleware);

// Apply Sentry request handler
app.use(sentryRequestHandler);

// ===================
// API Routes (v1)
// ===================

// Auth routes (bez wersjonowania - publiczne)
app.use('/auth', authRoutes);

// API v1 routes
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/import', importRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/cron', cronRoutes);

// NOTE: Legacy /api/* routes removed — frontend should use /api/v1/* only

// ===================
// Error Handling
// ===================

app.use(notFoundHandler);
app.use(sentryErrorHandler); // Capture errors to Sentry
app.use(errorHandler);       // Format response

module.exports = app;
