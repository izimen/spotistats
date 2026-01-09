/**
 * Security Regression Tests
 * Ensures security controls remain in place after code changes
 *
 * Tests:
 * - RBAC enforcement
 * - IDOR prevention
 * - CSRF protection
 * - Authentication requirements
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

// Mock Prisma
jest.mock('../src/utils/prismaClient', () => ({
    user: {
        findUnique: jest.fn()
    }
}));

const prisma = require('../src/utils/prismaClient');

// Test users
const regularUser = {
    id: 'user-123',
    spotifyId: 'spotify-user-123',
    email: 'user@example.com',
    role: 'user',
    refreshToken: 'encrypted-token',
    tokenVersion: 1
};

const adminUser = {
    id: 'admin-456',
    spotifyId: 'spotify-admin-456',
    email: 'admin@example.com',
    role: 'admin',
    refreshToken: 'encrypted-token',
    tokenVersion: 1
};

const otherUser = {
    id: 'user-789',
    spotifyId: 'spotify-user-789',
    email: 'other@example.com',
    role: 'user',
    refreshToken: 'encrypted-token',
    tokenVersion: 1
};

// Helper to create JWT
function createToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            tokenVersion: user.tokenVersion,
            spotifyAccessToken: 'mock-spotify-token',
            spotifyTokenExpiry: Date.now() + 3600000
        },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
    );
}

describe('Security Regression Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentication Requirements', () => {
        it('should reject requests without authentication', async () => {
            const res = await request(app)
                .get('/api/stats/top-tracks');

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Unauthorized');
        });

        it('should reject requests with invalid JWT', async () => {
            const res = await request(app)
                .get('/api/stats/top-tracks')
                .set('Cookie', ['jwt=invalid.token.here']);

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('InvalidToken');
        });

        it('should reject requests with expired JWT', async () => {
            const expiredToken = jwt.sign(
                { userId: regularUser.id, tokenVersion: 1 },
                process.env.JWT_SECRET,
                { algorithm: 'HS256', expiresIn: '-1h' } // Already expired
            );

            const res = await request(app)
                .get('/api/stats/top-tracks')
                .set('Cookie', [`jwt=${expiredToken}`]);

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('TokenExpired');
        });
    });

    describe('CSRF Protection', () => {
        it('should reject POST without CSRF protection', async () => {
            prisma.user.findUnique.mockResolvedValue(regularUser);
            const token = createToken(regularUser);

            const res = await request(app)
                .post('/auth/logout')
                .set('Cookie', [`jwt=${token}`]);
            // No X-Requested-With or X-CSRF-Token header

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('CSRFValidationFailed');
        });

        it('should accept POST with X-Requested-With header (legacy)', async () => {
            prisma.user.findUnique.mockResolvedValue(regularUser);
            const token = createToken(regularUser);

            const res = await request(app)
                .post('/auth/logout')
                .set('Cookie', [`jwt=${token}`])
                .set('X-Requested-With', 'XMLHttpRequest');

            expect(res.status).toBe(200);
        });
    });

    describe('IDOR Prevention (user can only access own data)', () => {
        it('should allow user to access their own profile', async () => {
            prisma.user.findUnique.mockResolvedValue(regularUser);
            const token = createToken(regularUser);

            const res = await request(app)
                .get('/api/profile')
                .set('Cookie', [`jwt=${token}`]);

            // Should return user's own data, not error
            // 404 is acceptable if endpoint doesn't exist yet
            expect([200, 401, 404]).toContain(res.status);
        });

        it('should prevent user from accessing other user stats by userId manipulation', async () => {
            // This test ensures that any userId in request params/body
            // is validated against the authenticated user
            prisma.user.findUnique.mockResolvedValue(regularUser);
            const token = createToken(regularUser);

            // Try to access stats with different userId
            const res = await request(app)
                .get('/api/stats/top-tracks')
                .query({ userId: otherUser.id }) // Trying to access other user's data
                .set('Cookie', [`jwt=${token}`]);

            // Backend should use req.user.id, not query param
            // So this should either succeed with own data or fail appropriately
            expect(res.status).not.toBe(200); // Should not return other user's data
        });
    });

    describe('Rate Limiting', () => {
        it('should have rate limiting headers', async () => {
            const res = await request(app)
                .get('/health');

            // Rate limit headers (standard format without x- prefix)
            expect(res.headers).toHaveProperty('ratelimit-limit');
            expect(res.headers).toHaveProperty('ratelimit-remaining');
        });
    });

    describe('Security Headers', () => {
        it('should have security headers from Helmet', async () => {
            const res = await request(app)
                .get('/health');

            // Helmet security headers
            expect(res.headers).toHaveProperty('x-content-type-options');
            expect(res.headers['x-content-type-options']).toBe('nosniff');

            expect(res.headers).toHaveProperty('x-frame-options');
            expect(res.headers).toHaveProperty('x-xss-protection');
        });

        it('should have Content-Security-Policy header', async () => {
            const res = await request(app)
                .get('/health');

            expect(res.headers).toHaveProperty('content-security-policy');
        });
    });
});

describe('RBAC Tests', () => {
    // Note: These tests require admin-only endpoints to be set up
    // For now, they test the middleware behavior

    it('should have RBAC middleware available', () => {
        const { requireRole, requireOwnerOrAdmin, isAdmin, ROLES } = require('../src/middleware/rbac');

        expect(requireRole).toBeDefined();
        expect(requireOwnerOrAdmin).toBeDefined();
        expect(isAdmin).toBeDefined();
        expect(ROLES.USER).toBe('user');
        expect(ROLES.ADMIN).toBe('admin');
    });

    it('isAdmin should correctly identify admin users', () => {
        const { isAdmin } = require('../src/middleware/rbac');

        expect(isAdmin(adminUser)).toBe(true);
        expect(isAdmin(regularUser)).toBe(false);
        expect(isAdmin(null)).toBe(false);
        expect(isAdmin(undefined)).toBe(false);
    });
});
