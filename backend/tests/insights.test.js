/**
 * Insights (period summary, calendar, CSV export) - 2026-11-21
 * SQL itself was validated on Postgres (PGlite); here we cover date logic,
 * validation, response shape and the export pagination.
 */
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SPOTIFY_CLIENT_ID = 'id';
process.env.SPOTIFY_CLIENT_SECRET = 'secret';
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:5000/auth/callback';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only_32chars';
process.env.FRONTEND_URL = 'http://localhost:5173';

const mockPrisma = {
    $queryRaw: jest.fn(),
    streamingHistory: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
    },
};
jest.mock('../src/utils/prismaClient', () => mockPrisma);

const insightsService = require('../src/services/insightsService');
const insightsController = require('../src/controllers/insightsController');

const { previousPeriod, computeStreaks, csvCell, isValidDate, addDays } = insightsService._internal;

function mockRes() {
    const res = { headers: {}, body: '' };
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
    res.write = jest.fn((chunk) => { res.body += chunk; });
    res.end = jest.fn();
    res.destroy = jest.fn();
    return res;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('date helpers', () => {
    it('validates real calendar dates only', () => {
        expect(isValidDate('2026-02-28')).toBe(true);
        expect(isValidDate('2026-02-30')).toBe(false);
        expect(isValidDate('2026-2-1')).toBe(false);
        expect(isValidDate(undefined)).toBe(false);
    });

    it('previous period is the previous calendar month / year / same-length window', () => {
        expect(previousPeriod('2026-03-01', '2026-04-01')).toEqual({ from: '2026-02-01', to: '2026-03-01' });
        expect(previousPeriod('2026-01-01', '2027-01-01')).toEqual({ from: '2025-01-01', to: '2026-01-01' });
        expect(previousPeriod('2026-11-10', '2026-11-17')).toEqual({ from: '2026-11-03', to: '2026-11-10' });
    });

    it('computes longest and current streaks', () => {
        const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10', '2026-11-19', '2026-11-20'];
        const s = computeStreaks(dates, '2026-11-21');
        expect(s.longest).toEqual({ length: 3, from: '2026-11-01', to: '2026-11-03' });
        // ended yesterday -> still alive today
        expect(s.current).toEqual({ length: 2, from: '2026-11-19', to: '2026-11-20' });
        expect(computeStreaks(dates, '2026-11-23').current.length).toBe(0);
        expect(computeStreaks([], '2026-11-21')).toEqual({
            longest: { length: 0, from: null, to: null },
            current: { length: 0, from: null, to: null },
        });
    });

    it('addDays crosses month and year boundaries', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
        expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });
});

describe('csvCell', () => {
    it('quotes separators and guards against formula injection', () => {
        expect(csvCell('plain')).toBe('plain');
        expect(csvCell('a,b')).toBe('"a,b"');
        expect(csvCell('say "hi"')).toBe('"say ""hi"""');
        expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
        expect(csvCell(null)).toBe('');
        expect(csvCell(new Date('2026-11-21T10:00:00Z'))).toBe('2026-11-21T10:00:00.000Z');
    });
});

describe('GET /stats/insights/summary', () => {
    it('rejects invalid ranges', async () => {
        for (const query of [
            { from: '2026-11-01' },
            { from: 'yesterday', to: '2026-11-02' },
            { from: '2026-11-02', to: '2026-11-01' },
            { from: '2000-01-01', to: '2026-01-01' },
        ]) {
            const res = mockRes();
            await insightsController.getSummary({ query, user: { id: 'u' } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(400);
        }
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('defaults to the current month', () => {
        const range = insightsController._resolveRange({});
        expect(range.from).toMatch(/^\d{4}-\d{2}-01$/);
        expect(insightsService._internal.addMonths(range.from, 1)).toBe(range.to);
    });

    it('builds totals, change vs previous period and listener profile', async () => {
        const totals = { plays: 200, ms: 600 * 60000, artists: 40, tracks: 120, activeDays: 20, night: 50, weekend: 60 };
        const prevTotals = { plays: 100, ms: 400 * 60000, artists: 40, tracks: 80, activeDays: 25, night: 0, weekend: 0 };
        mockPrisma.$queryRaw.mockImplementation((strings) => {
            const sql = strings.join('?');
            if (sql.includes('COUNT(DISTINCT "artistName")')) {
                // first totals call = current period, second = previous
                return Promise.resolve([mockPrisma.$queryRaw.mock.calls.filter(c => c[0].join('?').includes('COUNT(DISTINCT "artistName")')).length === 1 ? totals : prevTotals]);
            }
            if (sql.includes('NOT EXISTS')) return Promise.resolve([{ name: 'New', plays: 30, image: null, total: 7, totalPlays: 50 }]);
            if (sql.includes('GROUP BY "trackName", "artistName"')) return Promise.resolve([{ name: 'T', artist: 'A', plays: 9, minutes: 30 }]);
            if (sql.includes('GROUP BY "artistName"')) return Promise.resolve([{ name: 'A', plays: 40, minutes: 120 }]);
            if (sql.includes('to_char')) return Promise.resolve([
                { date: '2026-11-01', plays: 5, minutes: 15 },
                { date: '2026-11-02', plays: 12, minutes: 40 },
                { date: '2026-11-03', plays: 3, minutes: 9 },
                { date: '2026-11-05', plays: 1, minutes: 3 },
            ]);
            return Promise.resolve([]);
        });
        mockPrisma.streamingHistory.aggregate.mockResolvedValue({ _min: { playedAt: null }, _max: { playedAt: null } });

        const res = mockRes();
        const next = jest.fn();
        await insightsController.getSummary({ query: { from: '2026-11-01', to: '2026-12-01' }, user: { id: 'u' } }, res, next);

        expect(next).not.toHaveBeenCalled();
        const { data } = res.json.mock.calls[0][0];
        expect(data.period).toEqual({ from: '2026-11-01', to: '2026-12-01', days: 30 });
        expect(data.previousPeriod).toEqual({ from: '2026-10-01', to: '2026-11-01' });
        expect(data.totals).toMatchObject({ plays: 200, minutes: 600, uniqueArtists: 40 });
        expect(data.change).toEqual({ plays: 100, minutes: 50, uniqueArtists: 0, activeDays: -20 });
        expect(data.newArtists).toEqual({ count: 7, items: [{ name: 'New', plays: 30, image: null }] });
        expect(data.profile).toEqual({ variety: 20, repeat: 40, loyalty: 20, discovery: 25, night: 25, weekend: 30 });
        expect(data.streaks.longestInPeriod).toEqual({ length: 3, from: '2026-11-01', to: '2026-11-03' });
        expect(data.busiestDay).toEqual({ date: '2026-11-02', plays: 12, minutes: 40 });
    });

    it('converts local date boundaries to UTC in SQL (index-friendly)', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([]);
        mockPrisma.streamingHistory.aggregate.mockResolvedValue({ _min: {}, _max: {} });
        await insightsService.getPeriodSummary('u', '2026-11-01', '2026-12-01');

        const { Prisma } = require('@prisma/client');
        const [strings, ...values] = mockPrisma.$queryRaw.mock.calls[0];
        const full = Prisma.sql(strings, ...values);
        expect(full.text).toMatch(/"playedAt" >= \(\(\$\d+::timestamp AT TIME ZONE \$\d+\) AT TIME ZONE 'UTC'\)/);
        expect(full.values).toEqual(expect.arrayContaining(['u', '2026-11-01', '2026-12-01', 'Europe/Warsaw']));
    });

    it('reports no percentage when the previous period is empty', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([]);
        mockPrisma.streamingHistory.aggregate.mockResolvedValue({ _min: {}, _max: {} });
        const data = await insightsService.getPeriodSummary('u', '2026-11-01', '2026-12-01');
        expect(data.change).toEqual({ plays: null, minutes: null, uniqueArtists: null, activeDays: null });
        expect(data.profile.repeat).toBe(0);
    });
});

describe('GET /stats/insights/calendar', () => {
    it('clamps days and returns streaks', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([]);
        const res = mockRes();
        await insightsController.getCalendar({ query: { days: '99999' }, user: { id: 'u' } }, res, jest.fn());
        const { data } = res.json.mock.calls[0][0];
        expect(data.streaks.current.length).toBe(0);
        // 730 days max -> from is 729 days before today
        expect(insightsService._internal.daysBetween(data.from, data.to)).toBe(729);
    });
});

describe('GET /stats/listening-history/export', () => {
    it('streams all rows in keyset-paginated batches with a CSV header', async () => {
        const row = (i) => ({ id: `id${i}`, playedAt: new Date(Date.UTC(2026, 10, 1, 0, i)), trackName: `T${i}`, artistName: 'A', albumName: null, msPlayed: 1000, source: 'API', spotifyUri: null });
        mockPrisma.streamingHistory.findMany
            .mockResolvedValueOnce(Array.from({ length: 5000 }, (_, i) => row(i)))
            .mockResolvedValueOnce([row(5000), row(5001)]);

        const res = mockRes();
        await insightsController.exportHistory({ user: { id: 'u' } }, res, jest.fn());

        expect(res.headers['Content-Type']).toBe('text/csv; charset=utf-8');
        expect(res.headers['Content-Disposition']).toMatch(/attachment; filename="spotistats-history-\d{4}-\d{2}-\d{2}\.csv"/);
        const lines = res.body.replace(/\n$/, '').split('\n'); // not trim(): it would strip the BOM
        expect(lines[0]).toBe('﻿playedAt,trackName,artistName,albumName,msPlayed,source,spotifyUri');
        expect(lines).toHaveLength(5003);
        expect(mockPrisma.streamingHistory.findMany).toHaveBeenCalledTimes(2);
        expect(mockPrisma.streamingHistory.findMany.mock.calls[1][0]).toMatchObject({ cursor: { id: 'id4999' }, skip: 1, where: { userId: 'u' } });
        expect(res.end).toHaveBeenCalled();
    });

    it('passes errors to next when nothing was sent yet', async () => {
        const res = mockRes();
        res.write = jest.fn(() => { throw new Error('socket closed'); });
        const next = jest.fn();
        await insightsController.exportHistory({ user: { id: 'u' } }, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
