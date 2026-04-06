/**
 * useSpotifyData hook - fetches real data from backend API
 * With PREVIEW MODE support for standalone UI testing
 *
 * FIX #11: All hooks now call useQuery/useMutation unconditionally.
 * Preview mode is handled via queryFn, not conditional hook calls.
 * This complies with React Rules of Hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statsAPI, authAPI } from '@/lib/api';
import {
    isPreviewMode,
    MOCK_USER,
    MOCK_TOP_ARTISTS,
    MOCK_TOP_TRACKS,
    MOCK_RECENTLY_PLAYED,
    MOCK_LISTENING_CHART,
    MOCK_LISTENING_HISTORY,
    MOCK_AUDIO_FEATURES,
} from '@/lib/mockData';

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// FE-005: Proper TypeScript interfaces for API responses
export interface SpotifyUser {
    id: string;
    spotifyId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    product: string | null;
}

export interface SpotifyArtist {
    rank: number;
    name: string;
    image: string | null;
    genres: string[];
    spotifyUrl: string | null;
    popularity?: number;
}

export interface SpotifyTrack {
    rank: number;
    title: string;
    artist: string;
    album: string;
    image: string | null;
    duration: string;
    durationMs: number;
    previewUrl: string | null;
    spotifyUrl: string | null;
    trackId: string;
}

export interface SpotifyAlbum {
    rank: number;
    name: string;
    artist: string;
    image: string | null;
    spotifyUrl: string | null;
}

export interface RecentlyPlayedTrack {
    trackName: string;
    artistName: string;
    albumName: string;
    albumImage: string | null;
    playedAt: string;
    spotifyUrl: string | null;
    durationMs: number;
}

export interface HistoryPlay {
    id: string;
    trackName: string;
    artistName: string;
    albumName: string | null;
    albumImage?: string | null;
    msPlayed: number;
    playedAt: string;
    spotifyUri: string | null;
}

export interface OverviewStats {
    totalTracks: number;
    totalArtists: number;
    totalMinutes: number;
}

// Map UI time range to API time range
// Spotify API supports: short_term (~4 weeks), medium_term (~6 months), long_term (~1 year)
export const mapTimeRange = (uiRange: string): TimeRange => {
    switch (uiRange) {
        case 'week':
        case 'short_term':
            return 'short_term';
        case 'year':
        case 'all':  // "Wszystko" uses long_term (max available from Spotify)
        case 'long_term':
            return 'long_term';
        case 'month':
        case 'medium_term':
        default:
            return 'medium_term';
    }
};

const preview = isPreviewMode();

// Helper: simulate network delay for preview mode
const mockDelay = <T>(data: T): Promise<T> =>
    new Promise(resolve => setTimeout(() => resolve(data), 300));

// Fetch current user
export function useUser() {
    return useQuery<SpotifyUser>({
        queryKey: ['user'],
        queryFn: async () => {
            if (preview) return mockDelay(MOCK_USER);
            const response = await authAPI.getUser();
            return response.data.user;
        },
        staleTime: preview ? Infinity : 1000 * 60 * 5,
        retry: false,
    });
}

// Fetch top artists
export function useTopArtists(timeRange: TimeRange = 'medium_term', limit = 20) {
    return useQuery<SpotifyArtist[]>({
        queryKey: ['topArtists', timeRange, limit],
        queryFn: async () => {
            if (preview) return mockDelay(MOCK_TOP_ARTISTS.slice(0, limit));
            const response = await statsAPI.getTopArtists(timeRange, limit);
            return response.data.artists;
        },
        staleTime: preview ? Infinity : 1000 * 60 * 5,
    });
}

// Fetch top tracks
export function useTopTracks(timeRange: TimeRange = 'medium_term', limit = 20) {
    return useQuery<SpotifyTrack[]>({
        queryKey: ['topTracks', timeRange, limit],
        queryFn: async () => {
            if (preview) return mockDelay(MOCK_TOP_TRACKS.slice(0, limit));
            const response = await statsAPI.getTopTracks(timeRange, limit);
            return response.data.tracks;
        },
        staleTime: preview ? Infinity : 1000 * 60 * 5,
    });
}

// Fetch top albums
export function useTopAlbums(timeRange: TimeRange = 'medium_term', limit = 20) {
    return useQuery<SpotifyAlbum[]>({
        queryKey: ['topAlbums', timeRange, limit],
        queryFn: async () => {
            if (preview) return mockDelay([]);
            const response = await statsAPI.getTopAlbums(timeRange, limit);
            return response.data.albums;
        },
        staleTime: preview ? Infinity : 1000 * 60 * 5,
    });
}

// Fetch recently played
export function useRecentlyPlayed(limit = 50) {
    return useQuery<RecentlyPlayedTrack[]>({
        queryKey: ['recentlyPlayed', limit],
        queryFn: async () => {
            if (preview) return mockDelay(MOCK_RECENTLY_PLAYED);
            const response = await statsAPI.getRecentlyPlayed(limit);
            return response.data.tracks;
        },
        // PERF-005: Increased from 1min to 5min to reduce Spotify API quota usage
        staleTime: preview ? Infinity : 1000 * 60 * 5,
        refetchInterval: preview ? false : 1000 * 60 * 5,
        refetchIntervalInBackground: false,
    });
}

// Fetch listening history with date filtering (from persistent storage)
export function useListeningHistory(options: {
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
} = {}) {
    const queryKey = ['listeningHistory', options.from?.toISOString(), options.to?.toISOString(), options.limit, options.offset];

    return useQuery<{
        plays: HistoryPlay[];
        total: number;
        totalTimeMs?: number;
        hasMore: boolean;
        stats?: {
            mostLooped: { trackName: string; artistName: string; albumImage?: string; count: number } | null;
            topHours: { hour: number; count: number }[];
            uniqueTracks: number;
            repeatRatio: number;
        };
    }>({
        queryKey,
        queryFn: async () => {
            if (preview) return mockDelay(MOCK_LISTENING_HISTORY);
            const response = await statsAPI.getListeningHistory({
                from: options.from?.toISOString(),
                to: options.to?.toISOString(),
                limit: options.limit || 100,
                offset: options.offset || 0,
            });
            return response.data;
        },
        staleTime: preview ? Infinity : 1000 * 60 * 1,
    });
}

// Fetch overview stats
export function useOverview() {
    return useQuery<OverviewStats>({
        queryKey: ['overview'],
        queryFn: async () => {
            if (preview) return mockDelay({ totalTracks: 237, totalArtists: 89, totalMinutes: 830 });
            const response = await statsAPI.getOverview();
            return response.data.overview;
        },
        staleTime: preview ? Infinity : 1000 * 60 * 5,
    });
}

// ============================================
// Listening History (persistent collection)
// ============================================

export interface ListeningChartData {
    days: { day: string; count: number }[];
    stats: {
        totalPlays: number;
        firstPlay: string | null;
        lastPlay: string | null;
        collectionActive: boolean;
    };
}

// Fetch listening chart data from database
export function useListeningChart(days = 7) {
    return useQuery<ListeningChartData>({
        queryKey: ['listeningChart', days],
        queryFn: async () => {
            if (preview) return mockDelay(MOCK_LISTENING_CHART);
            const response = await statsAPI.getListeningChart(days);
            return response.data;
        },
        staleTime: preview ? Infinity : 1000 * 60 * 5,
    });
}

// Manually sync listening history
export function useSyncListeningHistory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (preview) {
                await new Promise(resolve => setTimeout(resolve, 500));
                return { synced: 5, total: 237 };
            }
            const response = await statsAPI.syncListeningHistory();
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listeningChart'] });
            queryClient.invalidateQueries({ queryKey: ['recentlyPlayed'] });
        },
    });
}

// Audio Features response type
interface AudioFeaturesResponse {
    success: boolean;
    trackCount: number;
    featuresCount: number;
    averages: {
        danceability: number;
        energy: number;
        valence: number;
        tempo: number;
        acousticness: number;
        instrumentalness: number;
        speechiness: number;
    } | null;
    mood: string;
    features: Array<{
        id: string;
        danceability: number;
        energy: number;
        valence: number;
        tempo: number;
        acousticness: number;
        instrumentalness: number;
        speechiness: number;
    }>;
}

// Get audio features for tracks (energy, danceability, valence, etc.)
export function useAudioFeatures(trackIds: string[]) {
    return useQuery<AudioFeaturesResponse>({
        queryKey: ['audioFeatures', trackIds],
        queryFn: async () => {
            if (preview) return mockDelay(MOCK_AUDIO_FEATURES);
            const response = await statsAPI.getAudioFeatures(trackIds);
            return response.data;
        },
        enabled: trackIds.length > 0,
        staleTime: preview ? Infinity : 1000 * 60 * 60,
    });
}
