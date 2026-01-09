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

// Import routes
const authRoutes = require('./routes/auth.routes');
const statsRoutes = require('./routes/stats.routes');
const importRoutes = require('./routes/import.routes');
const profileRoutes = require('./routes/profile.routes');
const cronRoutes = require('./routes/cron.routes');

// Create Express app
const app = express();

// Trust proxy - Required for Cloud Run / load balancers
// This makes req.ip read the real client IP from X-Forwarded-For header
// Without this, rate limiting would use the proxy's internal IP for ALL users
app.set('trust proxy', true);

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
// CORS - Allow frontend origin (support both localhost and 127.0.0.1)
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            env.frontendUrl,
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'https://spotistats-frontend-ox6p5to4qa-lm.a.run.app' // Cloud Run production
        ];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // For dev ease, we could allow all, but let's be specific for now
            // If specific regex needed for dynamic ports:
            // if (/^http:\/\/localhost:\d+$/.test(origin)) ...

            // Fallback: If strictly needed, check against env.frontendUrl only
            if (origin === env.frontendUrl) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
// Health Check
// ===================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: env.nodeEnv
    });
});

// ===================
// API Routes
// ===================

app.use('/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cron', cronRoutes);

// ===================
// Error Handling
// ===================

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
