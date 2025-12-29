/**
 * useSpotifyData hook - fetches real data from backend API
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statsAPI, authAPI } from '@/lib/api';

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// Map UI time range to API time range
export const mapTimeRange = (uiRange: string): TimeRange => {
    switch (uiRange) {
        case 'week':
        case 'short_term':
            return 'short_term';
        case 'year':
        case 'long_term':
            return 'long_term';
        case 'month':
        case 'medium_term':
        default:
            return 'medium_term';
    }
};

// Fetch current user
export function useUser() {
    return useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const response = await authAPI.getUser();
            return response.data.user;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false
    });
}

// Fetch top artists
export function useTopArtists(timeRange: TimeRange = 'medium_term', limit = 20) {
    return useQuery({
        queryKey: ['topArtists', timeRange, limit],
        queryFn: async () => {
            const response = await statsAPI.getTopArtists(timeRange, limit);
            return response.data.artists;
        },
        staleTime: 1000 * 60 * 5
    });
}

// Fetch top tracks
export function useTopTracks(timeRange: TimeRange = 'medium_term', limit = 20) {
    return useQuery({
        queryKey: ['topTracks', timeRange, limit],
        queryFn: async () => {
            const response = await statsAPI.getTopTracks(timeRange, limit);
            return response.data.tracks;
        },
        staleTime: 1000 * 60 * 5
    });
}

// Fetch top albums
export function useTopAlbums(timeRange: TimeRange = 'medium_term', limit = 20) {
    return useQuery({
        queryKey: ['topAlbums', timeRange, limit],
        queryFn: async () => {
            const response = await statsAPI.getTopAlbums(timeRange, limit);
            return response.data.albums;
        },
        staleTime: 1000 * 60 * 5
    });
}

// Fetch recently played
export function useRecentlyPlayed(limit = 50) {
    return useQuery({
        queryKey: ['recentlyPlayed', limit],
        queryFn: async () => {
            const response = await statsAPI.getRecentlyPlayed(limit);
            return response.data.tracks;
        },
        staleTime: 1000 * 60 * 1, // 1 minute
        refetchInterval: 1000 * 60 * 1, // Auto-refresh every 1 minute
        refetchIntervalInBackground: false, // Don't refresh when tab is hidden
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

    return useQuery({
        queryKey,
        queryFn: async () => {
            const response = await statsAPI.getListeningHistory({
                from: options.from?.toISOString(),
                to: options.to?.toISOString(),
                limit: options.limit || 100,
                offset: options.offset || 0,
            });
            return response.data;
        },
        staleTime: 1000 * 60 * 1, // 1 minute
    });
}

// Fetch overview stats
export function useOverview() {
    return useQuery({
        queryKey: ['overview'],
        queryFn: async () => {
            const response = await statsAPI.getOverview();
            return response.data.overview;
        },
        staleTime: 1000 * 60 * 5
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
            const response = await statsAPI.getListeningChart(days);
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Manually sync listening history
export function useSyncListeningHistory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await statsAPI.syncListeningHistory();
            return response.data;
        },
        onSuccess: () => {
            // Invalidate chart data to refresh after sync
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
            const response = await statsAPI.getAudioFeatures(trackIds);
            return response.data;
        },
        enabled: trackIds.length > 0,
        staleTime: 1000 * 60 * 30, // 30 minutes (audio features don't change)
    });
}
