/**
 * CSRF + cross-site (frontend and backend on different *.a.run.app hosts) tests
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/utils/prismaClient', () => ({
    user: { findUnique: jest.fn(), update: jest.fn() }
}));

const prisma = require('../src/utils/prismaClient');
const app = require('../src/app');
const { csrfTokenGenerator, hasBearerToken } = require('../src/middleware/csrf');

const user = { id: 'u1', spotifyId: 'sp1', tokenVersion: 1, tokenFamily: 'fam', refreshToken: 'enc' };
const sign = (u) => jwt.sign({ userId: u.id, tokenVersion: u.tokenVersion, tokenFamily: u.tokenFamily },
    process.env.JWT_SECRET, { expiresIn: '1h' });

describe('CSRF: Bearer-authenticated requests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.user.update.mockResolvedValue(user);
    });

    it('POST /auth/logout with Bearer and no CSRF token is accepted', async () => {
        const res = await request(app).post('/auth/logout').set('Authorization', `Bearer ${sign(user)}`);
        expect(res.status).toBe(200);
    });

    it('POST /auth/refresh with Bearer and no CSRF token passes CSRF and authenticates', async () => {
        // token still valid far in the future -> controller answers without calling Spotify
        prisma.user.findUnique
            .mockResolvedValueOnce(user) // protect
            .mockResolvedValueOnce({ spotifyAccessTokenExpiry: new Date(Date.now() + 3600e3) });
        const res = await request(app).post('/auth/refresh').set('Authorization', `Bearer ${sign(user)}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Token is still valid');
    });

    it('POST with invalid Bearer passes CSRF but is rejected by auth (401, not 403)', async () => {
        const res = await request(app).post('/auth/refresh').set('Authorization', 'Bearer garbage');
        expect(res.status).toBe(401);
    });

    it('cookie-only POST without CSRF token is still rejected', async () => {
        const res = await request(app).post('/auth/refresh').set('Cookie', [`jwt=${sign(user)}`]);
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('CSRFValidationFailed');
    });

    it('empty "Bearer " header does not bypass CSRF', async () => {
        const res = await request(app).post('/auth/refresh')
            .set('Cookie', [`jwt=${sign(user)}`]).set('Authorization', 'Bearer ');
        expect(res.status).toBe(403);
    });

    it('hasBearerToken only matches a non-empty Bearer credential', () => {
        const req = (v) => ({ get: () => v });
        expect(hasBearerToken(req('Bearer abc'))).toBe(true);
        expect(hasBearerToken(req('Basic abc'))).toBe(false);
        expect(hasBearerToken(req(undefined))).toBe(false);
    });
});

describe('CORS / cookies for the cross-site frontend', () => {
    it('exposes X-CSRF-Token to the allowed frontend origin', async () => {
        const res = await request(app).get('/health').set('Origin', process.env.FRONTEND_URL);
        expect(res.headers['access-control-expose-headers']).toMatch(/X-CSRF-Token/i);
        expect(res.headers['x-csrf-token']).toBeDefined();
    });

    it('preflight from the frontend allows Authorization and X-CSRF-Token', async () => {
        const res = await request(app).options('/auth/refresh')
            .set('Origin', process.env.FRONTEND_URL)
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'authorization,x-csrf-token,content-type');
        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/i);
        expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('preflight from a foreign origin is refused', async () => {
        const res = await request(app).options('/auth/refresh')
            .set('Origin', 'https://evil.example')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'authorization');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('csrf_token cookie is SameSite=None; Secure in production', () => {
        jest.isolateModules(() => {
            const prev = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const { csrfTokenGenerator: gen } = require('../src/middleware/csrf');
            process.env.NODE_ENV = prev;
            const cookies = [];
            const res = { cookie: (n, v, o) => cookies.push({ n, o }), setHeader: () => {} };
            gen({ cookies: {} }, res, () => {});
            expect(cookies[0].o).toMatchObject({ sameSite: 'none', secure: true, httpOnly: true });
        });
        expect(typeof csrfTokenGenerator).toBe('function');
    });
});
