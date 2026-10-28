/**
 * Graceful degradation tests
 * - Spotify endpoints restricted for dev-mode apps (audio-features, recommendations)
 * - Missing profile fields after the Feb 2026 dev-mode changes
 * - Database outage (e.g. paused Supabase project)
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

// spotify-web-api-node is mocked so that every instance shares these fns
const mockApi = {
    getAudioFeaturesForTracks: jest.fn(),
    getRecommendations: jest.fn(),
    getMe: jest.fn(),
    searchArtists: jest.fn(),
    searchTracks: jest.fn()
};
jest.mock('spotify-web-api-node', () => jest.fn().mockImplementation(() => mockApi));

const realSpotify = jest.requireActual('../src/services/spotifyService');
const { errorHandler, isDatabaseUnavailableError } = require('../src/middleware/errorHandler');

function spotifyError(status) {
    const err = new Error(`HTTP ${status}`);
    err.statusCode = status;
    return err;
}

describe('Spotify restricted endpoints', () => {
    beforeEach(() => jest.clearAllMocks());

    it('getAudioFeatures resolves empty + unavailable on 403 and stops calling Spotify', async () => {
        mockApi.getAudioFeaturesForTracks.mockRejectedValueOnce(spotifyError(403));

        const first = await realSpotify.getAudioFeatures('token', ['a', 'b']);
        expect(first.unavailable).toBe(true);
        expect(first.body.audio_features).toEqual([]);

        const second = await realSpotify.getAudioFeatures('token', ['a']);
        expect(second.unavailable).toBe(true);
        expect(mockApi.getAudioFeaturesForTracks).toHaveBeenCalledTimes(1);
    });

    it('getRecommendations resolves null on 404', async () => {
        mockApi.getRecommendations.mockRejectedValueOnce(spotifyError(404));
        await expect(realSpotify.getRecommendations('token', { seed_artists: ['x'] })).resolves.toBeNull();
    });

    it('getAudioFeatures still throws on non-restriction errors (e.g. 401)', async () => {
        jest.resetModules();
        const fresh = jest.requireActual('../src/services/spotifyService');
        mockApi.getAudioFeaturesForTracks.mockRejectedValueOnce(spotifyError(401));
        await expect(fresh.getAudioFeatures('token', ['a'])).rejects.toThrow('HTTP 401');
    });

    it('getUserProfile normalises missing email/country/product to null', async () => {
        mockApi.getMe.mockResolvedValueOnce({ body: { id: 'sp1', display_name: 'Kuba', images: [] } });
        const profile = await realSpotify.getUserProfile('token');
        expect(profile).toEqual({
            spotifyId: 'sp1', email: null, displayName: 'Kuba', avatarUrl: null, country: null, product: null
        });
    });
});

describe('Database outage handling', () => {
    function runHandler(err) {
        const res = {
            statusCode: null, headers: {}, body: null,
            status(c) { this.statusCode = c; return this; },
            set(k, v) { this.headers[k] = v; return this; },
            json(b) { this.body = b; return this; }
        };
        errorHandler(err, { method: 'GET', originalUrl: '/x', ip: '1' }, res, () => {});
        return res;
    }

    it('detects Prisma connection failures', () => {
        const init = new Error('x'); init.name = 'PrismaClientInitializationError';
        expect(isDatabaseUnavailableError(init)).toBe(true);
        expect(isDatabaseUnavailableError({ code: 'P1001', message: '' })).toBe(true);
        expect(isDatabaseUnavailableError(new Error('Error querying the database: FATAL: (ENOTFOUND) tenant/user postgres.abc not found'))).toBe(true);
        expect(isDatabaseUnavailableError(new Error('some bug'))).toBe(false);
    });

    it('maps DB outage to 503 with Retry-After', () => {
        const err = new Error("Can't reach database server at host:5432");
        const res = runHandler(err);
        expect(res.statusCode).toBe(503);
        expect(res.headers['Retry-After']).toBe('60');
        expect(res.body.title).toBe('Database Unavailable');
    });

    it('maps CORS rejection to 403 instead of 500', () => {
        const res = runHandler(new Error('Not allowed by CORS'));
        expect(res.statusCode).toBe(403);
    });

    it('protect middleware answers 503 (and keeps the cookie) when the DB is down', async () => {
        const prisma = require('../src/utils/prismaClient');
        const app = require('../src/app');
        const err = new Error("Can't reach database server"); err.name = 'PrismaClientInitializationError';
        prisma.user.findUnique.mockRejectedValueOnce(err);

        const token = jwt.sign({ userId: 'u1', tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const res = await request(app).get('/auth/me').set('Cookie', `jwt=${token}`);

        expect(res.status).toBe(503);
        const setCookie = (res.headers['set-cookie'] || []).join(';');
        expect(setCookie).not.toMatch(/jwt=;/);
    });
});
