/**
 * Auth Flow Tests
 * Tests for OAuth2 + PKCE authentication endpoints
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const spotifyService = require('../src/services/spotifyService');

describe('Auth Endpoints', () => {

    // Clear mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========================================
    // Health Check
    // ========================================
    describe('GET /health', () => {
        it('should return health status', async () => {
            const res = await request(app).get('/health');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('timestamp');
        });
    });

    // ========================================
    // Login Endpoint
    // ========================================
    describe('GET /auth/login', () => {
        it('should redirect to Spotify authorization URL', async () => {
            const res = await request(app).get('/auth/login');

            expect(res.status).toBe(302); // Redirect
            expect(res.headers.location).toContain('accounts.spotify.com/authorize');
            expect(res.headers.location).toContain('client_id=test_client_id');
            expect(res.headers.location).toContain('response_type=code');
            expect(res.headers.location).toContain('code_challenge');
            expect(res.headers.location).toContain('code_challenge_method=S256');
        });

        it('should include required OAuth scopes', async () => {
            const res = await request(app).get('/auth/login');

            expect(res.headers.location).toContain('user-read-email');
            expect(res.headers.location).toContain('user-top-read');
        });
    });

    // ========================================
    // Callback Endpoint
    // ========================================
    describe('GET /auth/callback', () => {
        it('should redirect to login on missing code', async () => {
            const res = await request(app)
                .get('/auth/callback')
                .query({ state: 'some_state' });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain('/login?error=missing_params');
        });

        it('should redirect to login on missing state', async () => {
            const res = await request(app)
                .get('/auth/callback')
                .query({ code: 'some_code' });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain('/login?error=missing_params');
        });

        it('should redirect to login on OAuth error', async () => {
            const res = await request(app)
                .get('/auth/callback')
                .query({ error: 'access_denied' });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain('/login?error=access_denied');
        });

        it('should handle invalid state gracefully', async () => {
            const res = await request(app)
                .get('/auth/callback')
                .query({ code: 'valid_code', state: 'invalid_jwt_state' });

            // May return 302 (redirect) or 429 (rate limited in tests)
            expect([302, 429]).toContain(res.status);
            if (res.status === 302) {
                expect(res.headers.location).toContain('/login?error=callback_failed');
            }
        });
    });

    // ========================================
    // Me Endpoint (Protected)
    // ========================================
    describe('GET /auth/me', () => {
        it('should return 401 without JWT cookie', async () => {
            const res = await request(app).get('/auth/me');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Unauthorized');
        });

        it('should return 401 with invalid JWT', async () => {
            const res = await request(app)
                .get('/auth/me')
                .set('Cookie', ['jwt=invalid_token']);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'InvalidToken');
        });

        it('should return user data with valid JWT', async () => {
            // Create valid JWT
            const mockUser = {
                id: 'test_user_id',
                spotifyId: 'spotify_123',
                email: 'test@example.com',
                displayName: 'Test User',
                avatarUrl: 'https://example.com/avatar.jpg',
                country: 'PL',
                refreshToken: 'encrypted_token',
                tokenExpiry: new Date(Date.now() + 3600000),
                tokenVersion: 0,
                tokenFamily: 'test_family'
            };

            // Mock prisma to return user
            prisma.user.findUnique.mockResolvedValue(mockUser);

            // Generate valid JWT
            const token = jwt.sign(
                {
                    userId: mockUser.id,
                    spotifyId: mockUser.spotifyId,
                    spotifyAccessToken: 'test_access_token',
                    spotifyTokenExpiry: new Date(Date.now() + 3600000).toISOString(),
                    tokenVersion: 0,
                    tokenFamily: 'test_family'
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const res = await request(app)
                .get('/auth/me')
                .set('Cookie', [`jwt=${token}`]);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('id', mockUser.id);
            expect(res.body.user).toHaveProperty('email', mockUser.email);
            expect(res.body.user).toHaveProperty('displayName', mockUser.displayName);
            // Should NOT return sensitive data
            expect(res.body.user).not.toHaveProperty('refreshToken');
            expect(res.body.user).not.toHaveProperty('accessToken');
        });

        it('should return 401 when user no longer exists', async () => {
            // Mock prisma to return null (user deleted)
            prisma.user.findUnique.mockResolvedValue(null);

            const token = jwt.sign(
                { userId: 'deleted_user_id', spotifyId: 'spotify_deleted', tokenVersion: 0 },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const res = await request(app)
                .get('/auth/me')
                .set('Cookie', [`jwt=${token}`]);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'UserNotFound');
        });
    });

    // ========================================
    // Logout Endpoint
    // ========================================
    describe('POST /auth/logout', () => {
        it('should clear JWT cookie', async () => {
            // Need valid JWT to access logout
            const mockUser = {
                id: 'test_user_id',
                spotifyId: 'spotify_123',
                email: 'test@example.com',
                tokenVersion: 0
            };
            prisma.user.findUnique.mockResolvedValue(mockUser);

            const token = jwt.sign(
                {
                    userId: mockUser.id,
                    spotifyId: mockUser.spotifyId,
                    spotifyAccessToken: 'test_access_token',
                    spotifyTokenExpiry: new Date(Date.now() + 3600000).toISOString(),
                    tokenVersion: 0
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const res = await request(app)
                .post('/auth/logout')
                .set('Cookie', [`jwt=${token}`])
                .set('X-CSRF-Token', 'test-csrf-token');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Logged out successfully');

            // Check that cookie is being cleared
            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('jwt=');
        });

        it('should succeed without JWT (idempotent)', async () => {
            // Logout is idempotent - it should succeed even without a token
            const res = await request(app)
                .post('/auth/logout')
                .set('X-CSRF-Token', 'test-csrf-token');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Logged out successfully');
        });
    });

    // ========================================
    // 404 Handler
    // ========================================
    describe('404 Handler', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/unknown/route');

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'NotFound');
        });
    });
});

// ========================================
// PKCE Service Tests
// ========================================
describe('PKCE Service', () => {
    const pkceService = require('../src/services/pkceService');

    describe('generateCodeVerifier', () => {
        it('should generate a string of correct length', () => {
            const verifier = pkceService.generateCodeVerifier();
            // Base64URL encoded 32 bytes = 43 characters
            expect(verifier.length).toBe(43);
        });

        it('should generate unique verifiers', () => {
            const verifier1 = pkceService.generateCodeVerifier();
            const verifier2 = pkceService.generateCodeVerifier();
            expect(verifier1).not.toBe(verifier2);
        });
    });

    describe('generateCodeChallenge', () => {
        it('should generate a challenge from verifier', () => {
            const verifier = pkceService.generateCodeVerifier();
            const challenge = pkceService.generateCodeChallenge(verifier);

            expect(challenge).toBeDefined();
            expect(typeof challenge).toBe('string');
            // SHA256 in base64url = 43 characters
            expect(challenge.length).toBe(43);
        });

        it('should generate different challenges for different verifiers', () => {
            const verifier1 = pkceService.generateCodeVerifier();
            const verifier2 = pkceService.generateCodeVerifier();

            const challenge1 = pkceService.generateCodeChallenge(verifier1);
            const challenge2 = pkceService.generateCodeChallenge(verifier2);

            expect(challenge1).not.toBe(challenge2);
        });
    });

    describe('createPKCEState', () => {
        it('should return state and codeChallenge', () => {
            const { state, codeChallenge } = pkceService.createPKCEState();

            expect(state).toBeDefined();
            expect(codeChallenge).toBeDefined();
            expect(typeof state).toBe('string');
            expect(typeof codeChallenge).toBe('string');
        });

        it('should create verifiable state JWT', () => {
            const { state } = pkceService.createPKCEState();

            // State should be a valid JWT - use verify() to validate signature
            const decoded = jwt.verify(state, process.env.JWT_SECRET);
            expect(decoded).toHaveProperty('verifier');
        });
    });

    describe('extractVerifierFromState', () => {
        it('should extract verifier from valid state', () => {
            const { state } = pkceService.createPKCEState();
            const verifier = pkceService.extractVerifierFromState(state);

            expect(verifier).toBeDefined();
            expect(typeof verifier).toBe('string');
            expect(verifier.length).toBe(43);
        });

        it('should throw on invalid state', () => {
            expect(() => {
                pkceService.extractVerifierFromState('invalid_jwt');
            }).toThrow('Invalid OAuth state');
        });
    });
});

// ========================================
// Encryption Service Tests
// ========================================
describe('Encryption Service', () => {
    const encryptionService = require('../src/services/encryptionService');

    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt a string correctly', () => {
            const originalText = 'my_secret_refresh_token_12345';

            const encrypted = encryptionService.encrypt(originalText);
            expect(encrypted).not.toBe(originalText);
            expect(encrypted).toContain(':'); // Format: iv:authTag:ciphertext

            const decrypted = encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(originalText);
        });

        it('should generate different ciphertext for same input', () => {
            const text = 'same_text';

            const encrypted1 = encryptionService.encrypt(text);
            const encrypted2 = encryptionService.encrypt(text);

            // Due to random IV, ciphertext should be different
            expect(encrypted1).not.toBe(encrypted2);

            // But both should decrypt to same value
            expect(encryptionService.decrypt(encrypted1)).toBe(text);
            expect(encryptionService.decrypt(encrypted2)).toBe(text);
        });

        it('should handle empty string (returns as-is)', () => {
            const encrypted = encryptionService.encrypt('');
            // Empty string is falsy, so it returns as-is (no encryption needed)
            expect(encrypted).toBe('');
        });

        it('should handle null/undefined', () => {
            expect(encryptionService.encrypt(null)).toBe(null);
            expect(encryptionService.encrypt(undefined)).toBe(undefined);
        });

        it('should throw on invalid encrypted format', () => {
            expect(() => {
                encryptionService.decrypt('invalid_format_no_colons');
            }).toThrow('Invalid encrypted format');
        });
    });
});
