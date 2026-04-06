/**
 * Tests for utility functions
 */
import { describe, it, expect } from 'vitest';
import { calculateTopGenres } from '@/lib/genreUtils';
import { calculateListeningAge, getAgeDescription } from '@/lib/listeningAge';

describe('genreUtils', () => {
    it('calculateTopGenres should return empty for no input', () => {
        const result = calculateTopGenres([], 0);
        expect(result.topGenres).toEqual([]);
    });

    it('calculateTopGenres should aggregate genres from artists', () => {
        const artists = [
            { genres: ['pop', 'rock'] },
            { genres: ['pop', 'indie'] },
            { genres: ['rock'] },
        ];
        const result = calculateTopGenres(artists, 3);
        expect(result.topGenres.length).toBeGreaterThan(0);
        const genreNames = result.topGenres.map((g: any) => g.name.toLowerCase());
        expect(genreNames).toContain('pop');
        expect(genreNames).toContain('rock');
    });

    it('calculateTopGenres should handle artists without genres', () => {
        const artists = [
            { genres: [] },
            { genres: undefined },
            {},
        ];
        const result = calculateTopGenres(artists as any, 5);
        expect(result.topGenres).toEqual([]);
    });
});

describe('listeningAge', () => {
    it('calculateListeningAge should return null for empty tracks', () => {
        expect(calculateListeningAge([])).toBeNull();
    });

    it('getAgeDescription should return string for valid age', () => {
        const desc = getAgeDescription(25);
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
    });

    it('getAgeDescription should handle null', () => {
        const desc = getAgeDescription(null);
        expect(typeof desc).toBe('string');
    });
});
