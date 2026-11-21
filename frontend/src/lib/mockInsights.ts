/**
 * Deterministic mock insights for VITE_PREVIEW_MODE (UI work without a backend).
 */
import type { ListeningCalendar, PeriodSummary, DayCount } from '@/hooks/useInsights';
import { MOCK_TOP_ARTISTS, MOCK_TOP_TRACKS } from './mockData';
import { toLocalDateString } from './period';

function seeded(seed: number) {
    let s = seed;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

function hash(str: string) {
    return [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

function mockDays(from: string, to: string): DayCount[] {
    const rand = seeded(hash(from));
    const days: DayCount[] = [];
    const end = new Date(`${to}T00:00:00`);
    const today = new Date();
    for (let d = new Date(`${from}T00:00:00`); d < end && d <= today; d.setDate(d.getDate() + 1)) {
        if (rand() < 0.22) continue; // some days without music
        const plays = Math.round(5 + rand() * 60);
        days.push({ date: toLocalDateString(d), plays, minutes: Math.round(plays * 3.4) });
    }
    return days;
}

const delay = <T>(data: T) => new Promise<T>(resolve => setTimeout(() => resolve(data), 300));

export function mockPeriodSummary(from: string, to: string): Promise<PeriodSummary> {
    const days = mockDays(from, to);
    const plays = days.reduce((s, d) => s + d.plays, 0);
    const minutes = days.reduce((s, d) => s + d.minutes, 0);
    const rand = seeded(hash(to));
    const factor = 0.7 + rand() * 0.6;
    const prevPlays = Math.round(plays / factor);
    const busiest = days.reduce<DayCount | null>((b, d) => (!b || d.plays > b.plays ? d : b), null);

    const topArtists = MOCK_TOP_ARTISTS.slice(0, 10).map((a, i) => ({
        name: a.name,
        plays: Math.max(1, Math.round(plays * (0.14 - i * 0.012))),
        minutes: Math.max(1, Math.round(minutes * (0.14 - i * 0.012))),
        image: a.image,
    }));
    const topTracks = MOCK_TOP_TRACKS.slice(0, 10).map((t, i) => ({
        name: t.name,
        artist: t.artists?.[0]?.name ?? '',
        plays: Math.max(1, Math.round(plays * (0.05 - i * 0.004))),
        minutes: Math.max(1, Math.round(minutes * (0.05 - i * 0.004))),
        image: t.album?.image ?? null,
    }));

    return delay({
        period: { from, to, days: Math.round((+new Date(to) - +new Date(from)) / 86400000) },
        previousPeriod: { from, to: from },
        dataRange: { first: '2025-03-01T00:00:00.000Z', last: new Date().toISOString() },
        totals: {
            plays, minutes, uniqueArtists: Math.round(plays * 0.18), uniqueTracks: Math.round(plays * 0.55),
            activeDays: days.length, nightPlays: Math.round(plays * 0.21), weekendPlays: Math.round(plays * 0.31),
        },
        previous: { plays: prevPlays, minutes: Math.round(minutes / factor), uniqueArtists: Math.round(prevPlays * 0.18), uniqueTracks: 0, activeDays: Math.round(days.length / factor) },
        change: plays ? {
            plays: Math.round((factor - 1) * 100),
            minutes: Math.round((factor - 1) * 100),
            uniqueArtists: Math.round((factor - 1) * 80),
            activeDays: Math.round((factor - 1) * 50),
        } : { plays: null, minutes: null, uniqueArtists: null, activeDays: null },
        topArtists: plays ? topArtists : [],
        topTracks: plays ? topTracks : [],
        newArtists: plays ? {
            count: 6,
            items: topArtists.slice(6, 10).map(a => ({ ...a, firstPlayedAt: `${from}T12:00:00.000Z` })),
        } : { count: 0, items: [] },
        profile: plays
            ? { variety: 18, repeat: 45, loyalty: 14, discovery: 9, night: 21, weekend: 31 }
            : { variety: 0, repeat: 0, loyalty: 0, discovery: 0, night: 0, weekend: 0 },
        streaks: { longestInPeriod: { length: Math.min(days.length, 9), from: days[0]?.date ?? null, to: days[8]?.date ?? null } },
        busiestDay: busiest,
        days,
    });
}

export function mockCalendar(count: number): Promise<ListeningCalendar> {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (count - 1));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const days = mockDays(toLocalDateString(start), toLocalDateString(tomorrow));
    return delay({
        from: toLocalDateString(start),
        to: toLocalDateString(today),
        days,
        activeDays: days.length,
        streaks: {
            longest: { length: 12, from: days[10]?.date ?? null, to: days[21]?.date ?? null },
            current: { length: 3, from: days[days.length - 3]?.date ?? null, to: days[days.length - 1]?.date ?? null },
        },
    });
}
