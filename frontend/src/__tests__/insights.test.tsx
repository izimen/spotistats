/**
 * Summary page / insights (2026-11-21): period helpers and rendering of real data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
    periodContaining, shiftPeriod, periodLabel, previousPeriodLabel, plural, formatMinutes, isCurrentOrFuture,
} from '@/lib/period';

const getInsightsSummary = vi.fn();
const getInsightsCalendar = vi.fn();
vi.mock('@/lib/api', () => ({
    statsAPI: {
        getInsightsSummary: (...a: unknown[]) => getInsightsSummary(...a),
        getInsightsCalendar: (...a: unknown[]) => getInsightsCalendar(...a),
        exportHistoryCsv: vi.fn(),
    },
    authAPI: { getMe: vi.fn().mockResolvedValue({ data: { user: { displayName: 'Test' } } }) },
    hasAuthToken: () => true,
}));

import Summary from '@/pages/Summary';
import ListenerProfile from '@/components/ListenerProfile';

describe('period helpers', () => {
    it('builds and shifts months across year boundaries', () => {
        const dec = periodContaining('month', new Date(2026, 11, 15));
        expect(dec).toEqual({ kind: 'month', from: '2026-12-01', to: '2027-01-01' });
        expect(shiftPeriod(dec, 1)).toEqual({ kind: 'month', from: '2027-01-01', to: '2027-02-01' });
        expect(shiftPeriod(dec, -12)).toEqual({ kind: 'month', from: '2025-12-01', to: '2026-01-01' });
        expect(shiftPeriod(periodContaining('year', new Date(2026, 5, 1)), -1)).toEqual({ kind: 'year', from: '2025-01-01', to: '2026-01-01' });
    });

    it('labels periods in Polish', () => {
        const nov = periodContaining('month', new Date(2026, 10, 21));
        expect(periodLabel(nov)).toBe('listopad 2026');
        expect(previousPeriodLabel(nov)).toBe('październik 2026');
        expect(periodLabel(periodContaining('year', new Date(2026, 0, 1)))).toBe('2026');
    });

    it('knows whether a period is still running', () => {
        const nov = periodContaining('month', new Date(2026, 10, 1));
        expect(isCurrentOrFuture(nov, new Date(2026, 10, 21))).toBe(true);
        expect(isCurrentOrFuture(nov, new Date(2026, 11, 1))).toBe(false);
    });

    it('handles Polish plurals and minute formatting', () => {
        expect([1, 2, 5, 12, 22, 25].map(n => plural(n, 'dzień', 'dni', 'dni'))).toEqual(['dzień', 'dni', 'dni', 'dni', 'dni', 'dni']);
        expect([1, 3, 13, 23, 100].map(n => plural(n, 'odtworzenie', 'odtworzenia', 'odtworzeń')))
            .toEqual(['odtworzenie', 'odtworzenia', 'odtworzeń', 'odtworzenia', 'odtworzeń']);
        expect(formatMinutes(45)).toBe('45 min');
        expect(formatMinutes(120)).toBe('2 h');
        expect(formatMinutes(135)).toBe('2 h 15 min');
    });
});

function renderWithClient(ui: ReactNode) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>{ui}</MemoryRouter>
        </QueryClientProvider>
    );
}

const summary = {
    period: { from: '2026-11-01', to: '2026-12-01', days: 30 },
    previousPeriod: { from: '2026-10-01', to: '2026-11-01' },
    dataRange: { first: '2026-01-10T10:00:00.000Z', last: '2026-11-21T10:00:00.000Z' },
    totals: { plays: 420, minutes: 1337, uniqueArtists: 64, uniqueTracks: 250, activeDays: 19, nightPlays: 40, weekendPlays: 100 },
    previous: { plays: 300, minutes: 1000, uniqueArtists: 70, uniqueTracks: 200, activeDays: 20 },
    change: { plays: 40, minutes: 34, uniqueArtists: -9, activeDays: null },
    topArtists: [{ name: 'Daft Punk', plays: 50, minutes: 170, image: null }],
    topTracks: [{ name: 'One More Time', artist: 'Daft Punk', plays: 12, minutes: 64, image: null }],
    newArtists: { count: 3, items: [{ name: 'Nowy Zespół', plays: 7, minutes: 20, image: null, firstPlayedAt: '2026-11-03T10:00:00Z' }] },
    profile: { variety: 15, repeat: 40, loyalty: 12, discovery: 5, night: 10, weekend: 24 },
    streaks: { longestInPeriod: { length: 6, from: '2026-11-02', to: '2026-11-07' } },
    busiestDay: { date: '2026-11-14', plays: 60, minutes: 200 },
    days: [],
};

describe('Summary page', () => {
    beforeEach(() => {
        getInsightsSummary.mockReset();
        getInsightsCalendar.mockReset();
        getInsightsSummary.mockResolvedValue({ data: { data: summary } });
        getInsightsCalendar.mockResolvedValue({
            data: { data: { from: '2025-11-22', to: '2026-11-21', days: [], activeDays: 0, streaks: { longest: { length: 9, from: null, to: null }, current: { length: 2, from: null, to: null } } } },
        });
    });

    it('shows totals, change vs previous period, top lists and records', async () => {
        renderWithClient(<Summary />);

        expect(await screen.findByText('One More Time')).toBeInTheDocument();
        expect(screen.getAllByText('Daft Punk').length).toBeGreaterThan(0);
        expect(screen.getByText(/3 nowi artyści/)).toBeInTheDocument();

        expect(screen.getByText('+40%')).toBeInTheDocument();
        expect(screen.getByText('-9%')).toBeInTheDocument();
        // no fake percentage when there is no baseline
        expect(screen.getByText(/brak danych z okresu/)).toBeInTheDocument();
        expect(screen.getByText('Nowy Zespół')).toBeInTheDocument();
        expect(screen.getByText('6 dni')).toBeInTheDocument();
        expect(screen.getByText('14 listopada 2026')).toBeInTheDocument();
        expect(getInsightsSummary).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-01$/), expect.stringMatching(/^\d{4}-\d{2}-01$/));
    });

    it('requests the previous month when stepping back', async () => {
        renderWithClient(<Summary />);
        await screen.findByText('One More Time');
        const [from] = getInsightsSummary.mock.calls[0];

        fireEvent.click(screen.getByLabelText('Poprzedni okres'));

        await waitFor(() => expect(getInsightsSummary).toHaveBeenCalledTimes(2));
        const [prevFrom, prevTo] = getInsightsSummary.mock.calls[1];
        expect(prevTo).toBe(from);
        expect(prevFrom < from).toBe(true);
    });

    it('switches to the yearly summary', async () => {
        renderWithClient(<Summary />);
        await screen.findByText('One More Time');
        fireEvent.click(screen.getByRole('button', { name: 'Rok' }));
        await waitFor(() => expect(getInsightsSummary).toHaveBeenCalledTimes(2));
        const [from, to] = getInsightsSummary.mock.calls[1];
        expect(from).toMatch(/^\d{4}-01-01$/);
        expect(Number(to.slice(0, 4)) - Number(from.slice(0, 4))).toBe(1);
    });
});

describe('ListenerProfile', () => {
    it('renders real percentages as meters', () => {
        render(<ListenerProfile profile={summary.profile} plays={420} />);
        expect(screen.getByRole('meter', { name: 'Powtórki' })).toHaveAttribute('aria-valuenow', '40');
        expect(screen.getByText('Na podstawie 420 odtworzeń')).toBeInTheDocument();
        expect(screen.queryByText('Taneczność')).not.toBeInTheDocument();
    });

    it('shows an empty state without plays', () => {
        render(<ListenerProfile profile={summary.profile} plays={0} />);
        expect(screen.getByText('Brak odtworzeń w tym okresie.')).toBeInTheDocument();
    });
});
