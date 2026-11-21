/**
 * Insights from our own listening history (GET /stats/insights/*).
 * Independent of the Spotify endpoints dev-mode apps lost in 2024-2026.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { statsAPI } from '@/lib/api';
import { isPreviewMode } from '@/lib/mockData';
import { mockCalendar, mockPeriodSummary } from '@/lib/mockInsights';

export interface RankedItem {
    name: string;
    artist?: string;
    plays: number;
    minutes: number;
    image: string | null;
    uri?: string | null;
}

export interface Streak {
    length: number;
    from: string | null;
    to: string | null;
}

export interface DayCount {
    date: string;
    plays: number;
    minutes: number;
}

/** Plain percentages of real plays in the period */
export interface ListenerProfile {
    /** distinct artists per 100 plays */
    variety: number;
    /** plays that were repeats of a track already played in the period */
    repeat: number;
    /** share of the #1 artist */
    loyalty: number;
    /** plays of artists heard for the first time in this period */
    discovery: number;
    /** 22:00-05:59 */
    night: number;
    weekend: number;
}

export interface PeriodTotals {
    plays: number;
    minutes: number;
    uniqueArtists: number;
    uniqueTracks: number;
    activeDays: number;
}

export interface PeriodSummary {
    period: { from: string; to: string; days: number };
    previousPeriod: { from: string; to: string };
    dataRange: { first: string | null; last: string | null };
    totals: PeriodTotals & { nightPlays: number; weekendPlays: number };
    previous: PeriodTotals;
    /** % change vs previous period; null when the previous period has no data */
    change: { plays: number | null; minutes: number | null; uniqueArtists: number | null; activeDays: number | null };
    topArtists: RankedItem[];
    topTracks: RankedItem[];
    newArtists: { count: number; items: (RankedItem & { firstPlayedAt: string })[] };
    profile: ListenerProfile;
    streaks: { longestInPeriod: Streak };
    busiestDay: DayCount | null;
    days: DayCount[];
}

export interface ListeningCalendar {
    from: string;
    to: string;
    days: DayCount[];
    activeDays: number;
    streaks: { longest: Streak; current: Streak };
}

const preview = isPreviewMode();
const STALE = 1000 * 60 * 10;

export function usePeriodSummary(from: string, to: string, enabled = true) {
    return useQuery<PeriodSummary>({
        queryKey: ['insightsSummary', from, to],
        queryFn: async () => {
            if (preview) return mockPeriodSummary(from, to);
            const response = await statsAPI.getInsightsSummary(from, to);
            return response.data.data;
        },
        enabled,
        staleTime: STALE,
        // keep showing the previous period while the next one loads (no layout jump)
        placeholderData: keepPreviousData,
        retry: 1,
    });
}

export function useListeningCalendar(days = 365) {
    return useQuery<ListeningCalendar>({
        queryKey: ['insightsCalendar', days],
        queryFn: async () => {
            if (preview) return mockCalendar(days);
            const response = await statsAPI.getInsightsCalendar(days);
            return response.data.data;
        },
        staleTime: STALE,
        retry: 1,
    });
}
