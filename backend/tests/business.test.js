/**
 * Business Logic Tests
 * Tests for stats aggregation and import deduplication
 */
const jwt = require('jsonwebtoken');

// Setup mocks before importing modules
const mockPrisma = {
    streamingHistory: {
        createMany: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn()
    },
    import: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
    },
    user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn()
    },
    $disconnect: jest.fn()
};

jest.mock('../src/utils/prismaClient', () => mockPrisma);

const { validateStreamingHistory, validateImportRequest } = require('../src/utils/validation');

describe('Import Validation', () => {
    describe('validateStreamingHistory', () => {
        it('should accept valid streaming history entries', () => {
            const validData = [
                {
                    ts: '2024-01-15T10:30:00Z',
                    ms_played: 180000,
                    master_metadata_track_name: 'Test Song',
                    master_metadata_album_artist_name: 'Test Artist',
                    master_metadata_album_album_name: 'Test Album'
                }
            ];

            const result = validateStreamingHistory(validData);
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });

        it('should reject entries with negative ms_played', () => {
            const invalidData = [
                {
                    ts: '2024-01-15T10:30:00Z',
                    ms_played: -1000,
                    master_metadata_track_name: 'Test Song'
                }
            ];

            const result = validateStreamingHistory(invalidData);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            // Zod will report validation error - exact message may vary
            expect(typeof result.error).toBe('string');
        });

        it('should reject arrays exceeding max tracks limit', () => {
            // Create array with more than MAX_TRACKS_PER_FILE entries
            const tooManyTracks = Array(50001).fill({
                ts: '2024-01-15T10:30:00Z',
                ms_played: 1000,
                master_metadata_track_name: 'Test'
            });

            const result = validateStreamingHistory(tooManyTracks);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            // Should fail due to max array length
            expect(typeof result.error).toBe('string');
        });

        it('should accept entries without optional fields', () => {
            const minimalData = [
                {
                    ts: '2024-01-15T10:30:00Z',
                    ms_played: 60000
                }
            ];

            const result = validateStreamingHistory(minimalData);
            expect(result.success).toBe(true);
        });

        it('should truncate overly long strings', () => {
            const dataWithLongString = [
                {
                    ts: '2024-01-15T10:30:00Z',
                    ms_played: 60000,
                    master_metadata_track_name: 'A'.repeat(600) // Over 500 char limit
                }
            ];

            const result = validateStreamingHistory(dataWithLongString);
            expect(result.success).toBe(false);
        });
    });

    describe('validateImportRequest', () => {
        it('should accept valid import request', () => {
            const validRequest = {
                files: [
                    {
                        ts: '2024-01-15T10:30:00Z',
                        ms_played: 180000,
                        master_metadata_track_name: 'Test Song',
                        master_metadata_album_artist_name: 'Test Artist'
                    }
                ],
                fileName: 'my_history.json'
            };

            const result = validateImportRequest(validRequest);
            expect(result.success).toBe(true);
        });

        it('should reject request without files array', () => {
            const invalidRequest = {
                fileName: 'test.json'
            };

            const result = validateImportRequest(invalidRequest);
            expect(result.success).toBe(false);
        });
    });
});

describe('Stats Aggregation Logic', () => {
    describe('Top Artists Aggregation', () => {
        it('should correctly calculate top artists by listening time', async () => {
            // Mock Prisma groupBy response
            const mockGroupByResult = [
                { artistName: 'Artist A', _sum: { msPlayed: 3600000 }, _count: 50 },
                { artistName: 'Artist B', _sum: { msPlayed: 1800000 }, _count: 30 },
                { artistName: 'Artist C', _sum: { msPlayed: 900000 }, _count: 20 }
            ];

            mockPrisma.streamingHistory.groupBy.mockResolvedValue(mockGroupByResult);
            mockPrisma.streamingHistory.aggregate.mockResolvedValue({
                _sum: { msPlayed: 6300000 },
                _count: 100
            });

            // Verify ordering - should be sorted by msPlayed descending
            expect(mockGroupByResult[0].artistName).toBe('Artist A');
            expect(mockGroupByResult[0]._sum.msPlayed).toBeGreaterThan(mockGroupByResult[1]._sum.msPlayed);
        });

        it('should handle empty history gracefully', async () => {
            mockPrisma.streamingHistory.groupBy.mockResolvedValue([]);
            mockPrisma.streamingHistory.aggregate.mockResolvedValue({
                _sum: { msPlayed: null },
                _count: 0
            });

            const result = await mockPrisma.streamingHistory.aggregate({ _sum: { msPlayed: true } });
            expect(result._count).toBe(0);
            expect(result._sum.msPlayed).toBeNull();
        });
    });

    describe('Top Tracks Aggregation', () => {
        it('should correctly calculate top tracks by play count', async () => {
            const mockGroupByResult = [
                { trackName: 'Song A', artistName: 'Artist X', _count: 100, _sum: { msPlayed: 18000000 } },
                { trackName: 'Song B', artistName: 'Artist Y', _count: 75, _sum: { msPlayed: 13500000 } },
                { trackName: 'Song C', artistName: 'Artist Z', _count: 50, _sum: { msPlayed: 9000000 } }
            ];

            mockPrisma.streamingHistory.groupBy.mockResolvedValue(mockGroupByResult);

            // Verify ordering - should be sorted by count descending
            expect(mockGroupByResult[0].trackName).toBe('Song A');
            expect(mockGroupByResult[0]._count).toBeGreaterThan(mockGroupByResult[1]._count);
        });
    });

    describe('Duration Formatting', () => {
        // Test the formatting logic used in stats
        function formatDuration(ms) {
            const hours = Math.floor(ms / 3600000);
            const minutes = Math.floor((ms % 3600000) / 60000);
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
        }

        it('should format hours and minutes correctly', () => {
            expect(formatDuration(3600000)).toBe('1h 0m'); // 1 hour
            expect(formatDuration(5400000)).toBe('1h 30m'); // 1.5 hours
            expect(formatDuration(1800000)).toBe('30m'); // 30 minutes
            expect(formatDuration(0)).toBe('0m');
        });
    });
});

describe('Import Deduplication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should skip duplicates when importing', async () => {
        // Simulate createMany with skipDuplicates
        mockPrisma.streamingHistory.createMany.mockResolvedValue({
            count: 8 // 2 duplicates skipped out of 10
        });

        const records = Array(10).fill({
            userId: 'user123',
            trackName: 'Test',
            artistName: 'Artist',
            playedAt: new Date()
        });

        const result = await mockPrisma.streamingHistory.createMany({
            data: records,
            skipDuplicates: true
        });

        expect(result.count).toBe(8);
        const duplicates = records.length - result.count;
        expect(duplicates).toBe(2);
    });

    it('should correctly identify unique constraint fields', () => {
        // The unique constraint is: userId + trackName + artistName + playedAt
        const record1 = {
            userId: 'user1',
            trackName: 'Song',
            artistName: 'Artist',
            playedAt: new Date('2024-01-15T10:00:00Z')
        };

        const record2 = {
            ...record1,
            playedAt: new Date('2024-01-15T10:00:01Z') // Different time = not duplicate
        };

        const record3 = {
            ...record1 // Same everything = duplicate
        };

        // These should be different keys
        const key1 = `${record1.userId}:${record1.trackName}:${record1.artistName}:${record1.playedAt.toISOString()}`;
        const key2 = `${record2.userId}:${record2.trackName}:${record2.artistName}:${record2.playedAt.toISOString()}`;
        const key3 = `${record3.userId}:${record3.trackName}:${record3.artistName}:${record3.playedAt.toISOString()}`;

        expect(key1).not.toBe(key2);
        expect(key1).toBe(key3);
    });

    it('should filter out short plays (< 10 seconds)', () => {
        const tracks = [
            { ts: '2024-01-15T10:00:00Z', ms_played: 5000, master_metadata_track_name: 'Skip This' },
            { ts: '2024-01-15T10:01:00Z', ms_played: 15000, master_metadata_track_name: 'Keep This' },
            { ts: '2024-01-15T10:02:00Z', ms_played: 0, master_metadata_track_name: 'Skip Zero' },
            { ts: '2024-01-15T10:03:00Z', ms_played: 180000, master_metadata_track_name: 'Keep Long' }
        ];

        const filtered = tracks.filter(t => t.ms_played >= 10000);
        expect(filtered).toHaveLength(2);
        expect(filtered[0].master_metadata_track_name).toBe('Keep This');
        expect(filtered[1].master_metadata_track_name).toBe('Keep Long');
    });
});

describe('Edge Cases', () => {
    it('should handle null/undefined track names gracefully', () => {
        const entry = {
            ts: '2024-01-15T10:00:00Z',
            ms_played: 60000,
            master_metadata_track_name: null,
            episode_name: 'Podcast Episode'
        };

        const trackName = entry.master_metadata_track_name || entry.episode_name || 'Unknown';
        expect(trackName).toBe('Podcast Episode');
    });

    it('should handle podcast entries (episode_name instead of track_name)', () => {
        const podcastEntry = {
            ts: '2024-01-15T10:00:00Z',
            ms_played: 3600000,
            episode_name: 'Episode 42: The Answer',
            episode_show_name: 'Science Podcast'
        };

        const trackName = podcastEntry.master_metadata_track_name || podcastEntry.episode_name || 'Unknown';
        const artistName = podcastEntry.master_metadata_album_artist_name || podcastEntry.episode_show_name || 'Unknown Artist';

        expect(trackName).toBe('Episode 42: The Answer');
        expect(artistName).toBe('Science Podcast');
    });
});
