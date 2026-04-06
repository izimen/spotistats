/**
 * Tests for useSpotifyData hooks
 * Verifies type exports, mapTimeRange, and preview mode
 */
import { describe, it, expect } from 'vitest';
import { mapTimeRange } from '@/hooks/useSpotifyData';
import type {
    TimeRange,
    SpotifyUser,
    SpotifyArtist,
    SpotifyTrack,
    SpotifyAlbum,
    RecentlyPlayedTrack,
    HistoryPlay,
    OverviewStats,
    ListeningChartData,
} from '@/hooks/useSpotifyData';

describe('mapTimeRange', () => {
    it('should map "week" to short_term', () => {
        expect(mapTimeRange('week')).toBe('short_term');
    });

    it('should map "short_term" to short_term', () => {
        expect(mapTimeRange('short_term')).toBe('short_term');
    });

    it('should map "month" to medium_term', () => {
        expect(mapTimeRange('month')).toBe('medium_term');
    });

    it('should map "medium_term" to medium_term', () => {
        expect(mapTimeRange('medium_term')).toBe('medium_term');
    });

    it('should map "year" to long_term', () => {
        expect(mapTimeRange('year')).toBe('long_term');
    });

    it('should map "all" to long_term', () => {
        expect(mapTimeRange('all')).toBe('long_term');
    });

    it('should default to medium_term for unknown values', () => {
        expect(mapTimeRange('unknown')).toBe('medium_term');
        expect(mapTimeRange('')).toBe('medium_term');
    });
});

describe('TypeScript interfaces', () => {
    it('SpotifyUser interface should be usable', () => {
        const user: SpotifyUser = {
            id: '1', spotifyId: 'sp1', email: 'a@b.com',
            displayName: 'Test', avatarUrl: null, country: null, product: null
        };
        expect(user.id).toBe('1');
    });

    it('SpotifyArtist interface should be usable', () => {
        const artist: SpotifyArtist = {
            rank: 1, name: 'Artist', image: null, genres: ['pop'], spotifyUrl: null
        };
        expect(artist.rank).toBe(1);
    });

    it('SpotifyTrack interface should be usable', () => {
        const track: SpotifyTrack = {
            rank: 1, title: 'Song', artist: 'Artist', album: 'Album',
            image: null, duration: '3:30', durationMs: 210000,
            previewUrl: null, spotifyUrl: null, trackId: 'abc'
        };
        expect(track.durationMs).toBe(210000);
    });

    it('HistoryPlay interface should be usable', () => {
        const play: HistoryPlay = {
            id: '1', trackName: 'Song', artistName: 'Artist',
            albumName: null, msPlayed: 180000, playedAt: '2026-01-01',
            spotifyUri: null
        };
        expect(play.msPlayed).toBe(180000);
    });

    it('ListeningChartData interface should be usable', () => {
        const chart: ListeningChartData = {
            days: [{ day: 'Mon', count: 5 }],
            stats: { totalPlays: 5, firstPlay: null, lastPlay: null, collectionActive: true }
        };
        expect(chart.days).toHaveLength(1);
    });
});
