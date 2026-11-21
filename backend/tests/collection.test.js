/**
 * Data-collection accuracy (2026-11-22)
 * - Spotify refresh-token rotation is persisted (conditional update)
 * - the Spotify grant is cleared only on a real invalid_grant (never on 429 / other errors)
 * - logout keeps the Spotify grant (collection continues); /auth/disconnect stops it
 * - a failed sync is counted as failed (lastSyncAt untouched); 429 stops the whole run
 * - gap detection + msPlayed recompute after insert
 */
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SPOTIFY_CLIENT_ID = 'id';
process.env.SPOTIFY_CLIENT_SECRET = 'secret';
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:5000/auth/callback';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only_32chars';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

const mockPrisma = {
    streamingHistory: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
};
jest.mock('../src/utils/prismaClient', () => mockPrisma);

const mockSpotify = {
    getRecentlyPlayed: jest.fn(),
    refreshAccessToken: jest.fn(),
};
jest.mock('../src/services/spotifyService', () => mockSpotify);

jest.mock('../src/services/encryptionService', () => ({
    encrypt: jest.fn((v) => `enc:${v}`),
    decrypt: jest.fn((v) => v.replace(/^enc:/, '')),
}));

const tokenService = require('../src/services/tokenService');
const listeningHistoryService = require('../src/services/listeningHistoryService');
const authController = require('../src/controllers/authController');
const cronController = require('../src/controllers/cronController');

function item(id, playedAt) {
    return {
        played_at: playedAt,
        track: { id, name: `T${id}`, uri: `spotify:track:${id}`, duration_ms: 200000, artists: [{ name: 'A' }], album: { name: 'Al', images: [] } },
    };
}

function mockRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.clearCookie = jest.fn(() => res);
    return res;
}

const expired = { spotifyAccessToken: 'enc:old', spotifyAccessTokenExpiry: new Date(Date.now() - 1000) };

beforeEach(() => {
    jest.clearAllMocks();
    tokenService._internal.accessTokenCache.clear();
    tokenService._internal.refreshLocks.clear();
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => { fn(); return 0; });
    mockPrisma.$executeRaw.mockResolvedValue(0);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.streamingHistory.findFirst.mockResolvedValue(null);
});

afterEach(() => {
    global.setTimeout.mockRestore?.();
});

describe('tokenService', () => {
    it('persists the rotated refresh token with a conditional update', async () => {
        mockPrisma.user.findUnique
            .mockResolvedValueOnce(expired)
            .mockResolvedValueOnce({ refreshToken: 'enc:r1' });
        mockSpotify.refreshAccessToken.mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2', expiresIn: 3600 });
        mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

        await expect(tokenService.getValidAccessToken('u1')).resolves.toBe('a2');

        const call = mockPrisma.user.updateMany.mock.calls[0][0];
        expect(call.where).toEqual({ id: 'u1', refreshToken: 'enc:r1' });
        expect(call.data.refreshToken).toBe('enc:r2');
        expect(call.data.spotifyAccessToken).toBe('enc:a2');
    });

    it('uses the token stored by a concurrent refresh when it loses the race', async () => {
        mockPrisma.user.findUnique
            .mockResolvedValueOnce(expired)
            .mockResolvedValueOnce({ refreshToken: 'enc:r1' })
            .mockResolvedValueOnce({ spotifyAccessToken: 'enc:winner', spotifyAccessTokenExpiry: new Date(Date.now() + 3600e3) });
        mockSpotify.refreshAccessToken.mockResolvedValue({ accessToken: 'mine', refreshToken: 'r2', expiresIn: 3600 });
        mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });

        await expect(tokenService.getValidAccessToken('u1')).resolves.toBe('winner');
    });

    it('clears the grant only on invalid_grant', async () => {
        mockPrisma.user.findUnique
            .mockResolvedValueOnce(expired)
            .mockResolvedValueOnce({ refreshToken: 'enc:r1' });
        const err = Object.assign(new Error('auth error'), { statusCode: 400, body: { error: 'invalid_grant', error_description: 'Refresh token revoked' } });
        mockSpotify.refreshAccessToken.mockRejectedValue(err);
        mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

        await expect(tokenService.getValidAccessToken('u1')).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REVOKED' });
        const call = mockPrisma.user.updateMany.mock.calls[0][0];
        expect(call.where).toEqual({ id: 'u1', refreshToken: 'enc:r1' });
        expect(call.data.refreshToken).toBeNull();
        expect(call.data.spotifyGrantRevokedAt).toBeInstanceOf(Date);
    });

    it('never clears the grant on 429 or other errors mentioning "revoked"', async () => {
        for (const err of [
            Object.assign(new Error('rate limited'), { statusCode: 429, body: { error: { reason: 'QUOTA_EXCEEDED' } } }),
            new Error('token revoked upstream?'),
        ]) {
            mockPrisma.user.findUnique
                .mockResolvedValueOnce(expired)
                .mockResolvedValueOnce({ refreshToken: 'enc:r1' });
            mockSpotify.refreshAccessToken.mockRejectedValueOnce(err);
            await expect(tokenService.getValidAccessToken('u1')).rejects.toBe(err);
        }
        expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });
});

describe('logout vs disconnect', () => {
    it('logout invalidates app sessions but keeps the Spotify grant', async () => {
        await authController.logout({ user: { id: 'u1' } }, mockRes(), jest.fn());
        const data = mockPrisma.user.update.mock.calls[0][0].data;
        expect(data).not.toHaveProperty('refreshToken');
        expect(data.tokenVersion).toEqual({ increment: 1 });
    });

    it('disconnect clears the grant and switches collection off', async () => {
        const res = mockRes();
        await authController.disconnect({ user: { id: 'u1' } }, res, jest.fn());
        const data = mockPrisma.user.update.mock.calls[0][0].data;
        expect(data.refreshToken).toBeNull();
        expect(data.collectionEnabled).toBe(false);
        expect(res.clearCookie).toHaveBeenCalled();
    });
});

describe('storeRecentPlays', () => {
    it('recomputes msPlayed from the oldest inserted play and keeps durationMs', async () => {
        mockPrisma.streamingHistory.createMany.mockResolvedValue({ count: 2 });
        const items = [item('b', '2026-11-21T10:05:00.000Z'), item('a', '2026-11-21T10:01:00.000Z')];

        const r = await listeningHistoryService.storeRecentPlays('u1', items);

        expect(r).toEqual({ collected: 2, skipped: 0, gapDetected: false });
        const rows = mockPrisma.streamingHistory.createMany.mock.calls[0][0].data;
        expect(rows[0].durationMs).toBe(200000);
        expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
        // the `from` parameter is the oldest played_at of the batch
        expect(mockPrisma.$executeRaw.mock.calls[0]).toContainEqual(new Date('2026-11-21T10:01:00.000Z'));
    });

    it('detects a gap when a full page is newer than the latest stored play', async () => {
        mockPrisma.streamingHistory.findFirst.mockResolvedValue({ playedAt: new Date('2026-11-20T00:00:00Z') });
        mockPrisma.streamingHistory.createMany.mockResolvedValue({ count: 50 });
        const items = Array.from({ length: 50 }, (_, i) => item(`t${i}`, new Date(Date.UTC(2026, 10, 21, 12) - i * 60000).toISOString()));

        const r = await listeningHistoryService.storeRecentPlays('u1', items);

        expect(r.gapDetected).toBe(true);
        expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { lastGapDetectedAt: expect.any(Date) },
        }));
    });

    it('no gap when the page overlaps stored plays', async () => {
        mockPrisma.streamingHistory.findFirst.mockResolvedValue({ playedAt: new Date(Date.UTC(2026, 10, 21, 11, 30)) });
        mockPrisma.streamingHistory.createMany.mockResolvedValue({ count: 10 });
        const items = Array.from({ length: 50 }, (_, i) => item(`t${i}`, new Date(Date.UTC(2026, 10, 21, 12) - i * 60000).toISOString()));

        const r = await listeningHistoryService.storeRecentPlays('u1', items);
        expect(r.gapDetected).toBe(false);
    });
});

describe('cron sync', () => {
    const valid = { spotifyAccessToken: 'enc:tok', spotifyAccessTokenExpiry: new Date(Date.now() + 3600e3) };

    it('only syncs users with collection enabled', async () => {
        mockPrisma.user.findMany.mockResolvedValue([]);
        await listeningHistoryService.collectForAllActiveUsers();
        expect(mockPrisma.user.findMany.mock.calls[0][0].where).toEqual({ refreshToken: { not: null }, collectionEnabled: true });
    });

    it('counts a Spotify failure as failed and does not touch lastSyncAt; endpoint answers 500', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-0001' }]);
        mockPrisma.user.findUnique.mockResolvedValue(valid);
        mockSpotify.getRecentlyPlayed.mockRejectedValue(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));

        const res = mockRes();
        await cronController.syncListeningHistory({}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, processed: 0, failed: 1 });
        const updates = mockPrisma.user.update.mock.calls.map(c => c[0].data);
        expect(updates.some(d => 'lastSyncAt' in d)).toBe(false);
        expect(updates).toContainEqual(expect.objectContaining({ syncFailureCount: { increment: 1 } }));
    });

    it('stops the whole run on 429 (quota is per developer account)', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-0001' }, { id: 'user-0002' }, { id: 'user-0003' }]);
        mockPrisma.user.findUnique.mockResolvedValue(valid);
        mockSpotify.getRecentlyPlayed.mockRejectedValue(Object.assign(new Error('Too many'), { statusCode: 429 }));

        const r = await listeningHistoryService.collectForAllActiveUsers();

        expect(mockSpotify.getRecentlyPlayed).toHaveBeenCalledTimes(1);
        expect(r).toMatchObject({ quotaExceeded: true, failed: 1, skipped: 2 });
    });

    it('success updates lastSyncAt and resets the failure counter; endpoint answers 200', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-0001' }]);
        mockPrisma.user.findUnique.mockResolvedValue(valid);
        mockSpotify.getRecentlyPlayed.mockResolvedValue({ body: { items: [item('a', '2026-11-21T10:00:00Z')] } });
        mockPrisma.streamingHistory.createMany.mockResolvedValue({ count: 1 });

        const res = mockRes();
        await cronController.syncListeningHistory({}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ lastSyncAt: expect.any(Date), syncFailureCount: 0, lastSyncError: null }),
        }));
        expect(mockSpotify.refreshAccessToken).not.toHaveBeenCalled(); // stored token reused
    });
});

describe('Spotify rate limit wrapper', () => {
    it('fails fast on a long Retry-After instead of sleeping (QUOTA_EXCEEDED)', async () => {
        const real = jest.requireActual('../src/services/spotifyService');
        global.setTimeout.mockRestore?.();
        const err = Object.assign(new Error('Too Many Requests'), {
            statusCode: 429, headers: { 'retry-after': '3600' }, body: { error: { reason: 'QUOTA_EXCEEDED' } },
        });
        const call = jest.fn().mockRejectedValue(err);

        const started = Date.now();
        await expect(real.withRateLimitHandling(call)).rejects.toMatchObject({ statusCode: 429, retryAfter: 3600 });
        expect(call).toHaveBeenCalledTimes(1);
        // later calls on this instance fail fast too (no hour-long sleep)
        await expect(real.withRateLimitHandling(jest.fn())).rejects.toMatchObject({ statusCode: 429 });
        expect(Date.now() - started).toBeLessThan(1000);
    });
});
