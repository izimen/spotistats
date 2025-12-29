/**
 * PKCE (Proof Key for Code Exchange) Service
 * Implements stateless PKCE using signed JWT state parameter
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate a random code verifier (43-128 characters)
 * Uses URL-safe base64 encoding
 */
function generateCodeVerifier() {
    // 32 bytes = 43 characters when base64url encoded
    return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Generate code challenge from verifier using SHA256
 * @param {string} verifier - The code verifier
 * @returns {string} - Base64URL encoded SHA256 hash
 */
function generateCodeChallenge(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64URLEncode(hash);
}

/**
 * Base64URL encode a buffer
 * @param {Buffer} buffer - Buffer to encode
 * @returns {string} - Base64URL encoded string
 */
function base64URLEncode(buffer) {
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Create a signed state parameter containing the code verifier
 * This makes PKCE stateless - no server-side session storage needed
 * @returns {{ state: string, codeChallenge: string }}
 */
function createPKCEState() {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Sign the verifier in a JWT for stateless verification
    const state = jwt.sign(
        { verifier: codeVerifier },
        env.jwt.secret,
        { expiresIn: '10m' } // State valid for 10 minutes
    );

    return {
        state,
        codeChallenge
    };
}

/**
 * Extract and verify the code verifier from the signed state
 * @param {string} state - The signed state JWT
 * @returns {string} - The code verifier
 * @throws {Error} - If state is invalid or expired
 */
function extractVerifierFromState(state) {
    try {
        const decoded = jwt.verify(state, env.jwt.secret, { algorithms: ['HS256'] });
        return decoded.verifier;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('OAuth state has expired. Please try logging in again.');
        }
        throw new Error('Invalid OAuth state. Please try logging in again.');
    }
}

module.exports = {
    generateCodeVerifier,
    generateCodeChallenge,
    base64URLEncode,
    createPKCEState,
    extractVerifierFromState
};
