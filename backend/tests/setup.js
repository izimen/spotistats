/**
 * Test Setup
 * Global mocks and configuration for tests
 */

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:5000/auth/callback';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only_32chars';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

// Mock Prisma Client with all required methods
jest.mock('../src/utils/prismaClient', () => ({
    user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
    },
    streamingHistory: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn()
    },
    import: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn()
    },
    $transaction: jest.fn((callbacks) => Promise.all(callbacks)),
    $disconnect: jest.fn()
}));

// Mock Spotify Service (we don't want actual API calls in tests)
jest.mock('../src/services/spotifyService', () => ({
    exchangeCodeForTokens: jest.fn(),
    getUserProfile: jest.fn(),
    refreshAccessToken: jest.fn(),
    createSpotifyApi: jest.fn(),
    getTopArtists: jest.fn(),
    getTopTracks: jest.fn(),
    getRecentlyPlayed: jest.fn(),
    withRateLimitHandling: jest.fn((fn) => fn())
}));

// Silence console during tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
};
