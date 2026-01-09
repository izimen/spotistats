/**
 * Audit Logger Service
 * Logs sensitive operations for security monitoring
 *
 * Tracks:
 * - Import operations
 * - Delete operations
 * - Admin actions
 * - Auth events (failures)
 *
 * In production, this could be extended to:
 * - Write to separate audit table
 * - Send to external logging service (e.g., Cloud Logging)
 * - Trigger alerts for suspicious patterns
 */
const env = require('../config/env');

/**
 * Audit event types
 */
const AUDIT_EVENTS = {
    // Import events
    IMPORT_STARTED: 'import.started',
    IMPORT_COMPLETED: 'import.completed',
    IMPORT_FAILED: 'import.failed',

    // Delete events
    HISTORY_DELETED: 'history.deleted',
    ACCOUNT_DELETED: 'account.deleted',

    // Auth events
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILED: 'auth.login.failed',
    LOGOUT: 'auth.logout',
    TOKEN_REFRESH: 'auth.token.refresh',
    SESSION_INVALIDATED: 'auth.session.invalidated',

    // Admin events
    ADMIN_ACTION: 'admin.action',

    // Role events (RBAC audit trail)
    ROLE_CHANGED: 'role.changed',
    ROLE_ACCESS_DENIED: 'role.access.denied',
    ROLE_ESCALATION_ATTEMPT: 'role.escalation.attempt',

    // Cron events
    CRON_SYNC_STARTED: 'cron.sync.started',
    CRON_SYNC_COMPLETED: 'cron.sync.completed',
    CRON_SYNC_FAILED: 'cron.sync.failed',

    // Security events
    CSRF_VALIDATION_FAILED: 'security.csrf.failed',
    RATE_LIMIT_EXCEEDED: 'security.ratelimit.exceeded',
    SUSPICIOUS_ACTIVITY: 'security.suspicious'
};

/**
 * Log an audit event
 *
 * @param {string} event - Event type from AUDIT_EVENTS
 * @param {Object} data - Event data
 * @param {string} data.userId - User ID (if applicable)
 * @param {string} data.action - Human-readable action description
 * @param {Object} data.metadata - Additional event-specific data
 * @param {string} data.ip - Client IP address
 * @param {string} data.userAgent - Client user agent
 */
function logAuditEvent(event, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        event,
        userId: data.userId || 'anonymous',
        action: data.action || event,
        ip: data.ip || 'unknown',
        userAgent: data.userAgent || 'unknown',
        metadata: data.metadata || {},
        environment: env.nodeEnv
    };

    // Format for structured logging (works well with Cloud Logging)
    const logMessage = JSON.stringify({
        severity: getEventSeverity(event),
        ...logEntry
    });

    // Log based on event severity
    if (event.includes('failed') || event.includes('denied')) {
        console.error(`[AUDIT] ${logMessage}`);
    } else if (event.includes('delete') || event.includes('admin')) {
        console.warn(`[AUDIT] ${logMessage}`);
    } else {
        console.log(`[AUDIT] ${logMessage}`);
    }

    // In production, could also write to database or external service
    // await prisma.auditLog.create({ data: logEntry });

    return logEntry;
}

/**
 * Get severity level for event type
 */
function getEventSeverity(event) {
    if (event.includes('failed') || event.includes('denied')) {
        return 'ERROR';
    }
    if (event.includes('delete') || event.includes('admin')) {
        return 'WARNING';
    }
    return 'INFO';
}

/**
 * Create audit middleware for routes
 * Automatically logs request completion with user info
 *
 * @param {string} eventType - Event type to log
 * @param {Function} getMetadata - Optional function to extract metadata from req
 */
function auditMiddleware(eventType, getMetadata = null) {
    return (req, res, next) => {
        // Store original end function
        const originalEnd = res.end;

        // Override end to log after response
        res.end = function (...args) {
            // Log the audit event
            logAuditEvent(eventType, {
                userId: req.user?.id,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                metadata: {
                    method: req.method,
                    path: req.originalUrl,
                    statusCode: res.statusCode,
                    ...(getMetadata ? getMetadata(req, res) : {})
                }
            });

            // Call original end
            return originalEnd.apply(this, args);
        };

        next();
    };
}

module.exports = {
    AUDIT_EVENTS,
    logAuditEvent,
    auditMiddleware
};
