/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides role-based authorization for protected endpoints
 *
 * User roles are stored in JWT claims and validated against DB
 * Default role: 'user' (standard authenticated user)
 * Admin role: 'admin' (elevated privileges for maintenance)
 */
const { logAuditEvent, AUDIT_EVENTS } = require('../services/auditService');

/**
 * User roles enum
 */
const ROLES = {
    USER: 'user',
    ADMIN: 'admin'
};

/**
 * Require specific role(s) for endpoint access
 * Must be used AFTER protect middleware
 *
 * @param {...string} allowedRoles - Roles that can access this endpoint
 * @returns {Function} Express middleware
 *
 * @example
 * // Single role
 * router.get('/admin', protect, requireRole('admin'), adminController.dashboard);
 *
 * // Multiple roles
 * router.get('/stats', protect, requireRole('user', 'admin'), statsController.get);
 */
function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        try {
            // Must have user from protect middleware
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }

            // Get user's role (default to 'user' if not set)
            const userRole = req.user.role || ROLES.USER;

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(userRole)) {
                // Log access denied event
                logAuditEvent(AUDIT_EVENTS.ROLE_ACCESS_DENIED, {
                    userId: req.user.id,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    metadata: {
                        userRole,
                        requiredRoles: allowedRoles,
                        method: req.method,
                        path: req.originalUrl
                    }
                });

                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'You do not have permission to access this resource'
                });
            }

            // Log successful admin access for audit
            if (userRole === ROLES.ADMIN) {
                logAuditEvent(AUDIT_EVENTS.ADMIN_ACTION, {
                    userId: req.user.id,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    action: `Admin accessed ${req.method} ${req.originalUrl}`,
                    metadata: {
                        method: req.method,
                        path: req.originalUrl
                    }
                });
            }

            next();
        } catch (error) {
            console.error('[RBAC] Error:', error);
            return res.status(500).json({
                error: 'ServerError',
                message: 'Authorization check failed'
            });
        }
    };
}

/**
 * Check if current user is admin
 * Utility function for inline checks
 *
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
function isAdmin(user) {
    return user?.role === ROLES.ADMIN;
}

/**
 * Require owner or admin access
 * Checks if user is accessing their own resource or has admin role
 *
 * @param {Function} getResourceUserId - Function that extracts owner userId from request
 * @returns {Function} Express middleware
 *
 * @example
 * router.delete('/users/:id', protect, requireOwnerOrAdmin(req => req.params.id), userController.delete);
 */
function requireOwnerOrAdmin(getResourceUserId) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }

            const resourceUserId = getResourceUserId(req);
            const isOwner = req.user.id === resourceUserId;
            const hasAdminRole = req.user.role === ROLES.ADMIN;

            if (!isOwner && !hasAdminRole) {
                console.warn(`[RBAC] Access denied: user ${req.user.id} tried to access resource owned by ${resourceUserId}`);
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'You can only access your own resources'
                });
            }

            next();
        } catch (error) {
            console.error('[RBAC] Owner check error:', error);
            return res.status(500).json({
                error: 'ServerError',
                message: 'Authorization check failed'
            });
        }
    };
}

module.exports = {
    ROLES,
    requireRole,
    requireOwnerOrAdmin,
    isAdmin
};
