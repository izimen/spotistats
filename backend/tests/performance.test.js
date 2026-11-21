/**
 * Performance regressions (2026-11-21 review)
 * - recently-played is fetched from Spotify once and reused for history collection
 * - collectFromAPI uses createMany's count instead of two COUNT queries
 * - decrypted Spotify access tokens are cached per instance
 * - hour/weekday buckets are computed in the app timezone, not UTC
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
        count: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $queryRaw: jest.fn(),
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

const listeningHistoryService = require('../src/services/listeningHistoryService');
const statsController = require('../src/controllers/statsController');
const encryptionService = require('../src/services/encryptionService');

function recentItem(id, playedAt) {
    return {
        played_at: playedAt,
        track: {
            id,
            name: `Track ${id}`,
            uri: `spotify:track:${id}`,
            duration_ms: 200000,
            artists: [{ id: 'a1', name: 'Artist' }],
            album: { id: 'al1', name: 'Album', images: [{ url: 'big' }, { url: 'mid' }, { url: 'small' }] },
            external_urls: { spotify: `https://open.spotify.com/track/${id}` },
        },
    };
}

function mockRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('collectFromAPI', () => {
    it('uses prefetched items without calling Spotify and reports createMany count', async () => {
        mockPrisma.streamingHistory.createMany.mockResolvedValue({ count: 1 });
        const items = [recentItem('t1', '2026-11-21T10:00:00Z'), recentItem('t2', '2026-11-21T09:55:00Z')];

        const result = await listeningHistoryService.collectFromAPI('user1', 'token', items);

        expect(mockSpotify.getRecentlyPlayed).not.toHaveBeenCalled();
        expect(mockPrisma.streamingHistory.count).not.toHaveBeenCalled();
        expect(result).toEqual({ collected: 1, skipped: 1 });
        expect(mockPrisma.streamingHistory.createMany).toHaveBeenCalledWith(
            expect.objectContaining({ skipDuplicates: true })
        );
    });

    it('fetches from Spotify when nothing is prefetched', async () => {
        mockSpotify.getRecentlyPlayed.mockResolvedValue({ body: { items: [recentItem('t1', '2026-11-21T10:00:00Z')] } });
        mockPrisma.streamingHistory.createMany.mockResolvedValue({ count: 1 });

        const result = await listeningHistoryService.collectFromAPI('user1', 'token');

        expect(mockSpotify.getRecentlyPlayed).toHaveBeenCalledWith('token', { limit: 50 });
        expect(result.collected).toBe(1);
    });
});

describe('GET /stats/recent', () => {
    it('calls Spotify recently-played exactly once and slices to the requested limit', async () => {
        const items = Array.from({ length: 50 }, (_, i) =>
            recentItem(`t${i}`, new Date(Date.UTC(2026, 10, 21, 10, 0, 0) - i * 60000).toISOString())
        );
        mockSpotify.getRecentlyPlayed.mockResolvedValue({ body: { items } });
        mockPrisma.streamingHistory.createMany.mockResolvedValue({ count: 0 });
        mockPrisma.user.findUnique.mockResolvedValue({
            spotifyAccessToken: 'enc:live-token',
            spotifyAccessTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        });

        const req = { query: { limit: '10' }, user: { id: 'recent-user' } };
        const res = mockRes();
        const next = jest.fn();
        await statsController.getRecentlyPlayed(req, res, next);
        await new Promise(setImmediate); // let background collection run

        expect(next).not.toHaveBeenCalled();
        expect(mockSpotify.getRecentlyPlayed).toHaveBeenCalledTimes(1);
        expect(res.json.mock.calls[0][0].tracks).toHaveLength(10);
        // background collection got all 50 items
        expect(mockPrisma.streamingHistory.createMany.mock.calls[0][0].data).toHaveLength(50);
    });
});

describe('access token cache', () => {
    it('reads and decrypts the token from the DB only once per user while it is valid', async () => {
        mockSpotify.getRecentlyPlayed.mockResolvedValue({ body: { items: [] } });
        mockPrisma.user.findUnique.mockResolvedValue({
            spotifyAccessToken: 'enc:cached-token',
            spotifyAccessTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        });

        for (let i = 0; i < 3; i++) {
            await statsController.getRecentlyPlayed(
                { query: {}, user: { id: 'cache-user' } }, mockRes(), jest.fn()
            );
        }

        expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
        expect(encryptionService.decrypt).toHaveBeenCalledTimes(1);
        expect(mockSpotify.getRecentlyPlayed).toHaveBeenCalledWith('cached-token', { limit: 50 });
    });

    it('does not cache a token that is about to expire', async () => {
        mockSpotify.getRecentlyPlayed.mockResolvedValue({ body: { items: [] } });
        mockSpotify.refreshAccessToken.mockResolvedValue({ accessToken: 'fresh', expiresIn: 3600 });
        mockPrisma.user.findUnique
            .mockResolvedValueOnce({
                spotifyAccessToken: 'enc:old',
                spotifyAccessTokenExpiry: new Date(Date.now() + 60 * 1000), // inside 5 min buffer
            })
            .mockResolvedValueOnce({ refreshToken: 'enc:refresh' });
        mockPrisma.user.update.mockResolvedValue({});

        await statsController.getRecentlyPlayed(
            { query: {}, user: { id: 'expiring-user' } }, mockRes(), jest.fn()
        );

        expect(mockSpotify.refreshAccessToken).toHaveBeenCalledWith('refresh');
        expect(mockSpotify.getRecentlyPlayed).toHaveBeenCalledWith('fresh', { limit: 50 });
    });
});

describe('timezone-aware aggregation', () => {
    it('converts playedAt from UTC to the app timezone before extracting the hour', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ hour: 21, count: 4 }]);

        const result = await listeningHistoryService.getListeningByHour('user1');

        // $queryRaw is a tagged template: [strings, ...values]; the hour expression is a nested Prisma.sql
        const [, hourExpr] = mockPrisma.$queryRaw.mock.calls[0];
        expect(hourExpr.sql).toMatch(/"playedAt" AT TIME ZONE 'UTC' AT TIME ZONE (\$1|\?)/);
        expect(hourExpr.values).toEqual(['Europe/Warsaw']);
        expect(result.find(h => h.hour === 21)).toEqual({ hour: 21, count: 4, intensity: 1 });
    });

    it('returns Polish weekday names with diacritics, Monday first', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ dow: 1, count: 2 }, { dow: 3, count: 5 }]);

        const days = await listeningHistoryService.getListeningByDay('user1', 7);

        expect(days.map(d => d.day)).toEqual(
            ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
        );
        expect(days[2]).toEqual({ day: 'Środa', count: 5 });
    });
});
