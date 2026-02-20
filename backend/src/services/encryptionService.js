/**
 * Encryption Service
 * Handles encryption/decryption of sensitive data (refresh tokens)
 */
const crypto = require('crypto');
const env = require('../config/env');

// SECURITY FIX: Use dedicated ENCRYPTION_KEY instead of JWT_SECRET
// This ensures compromise of one key does not compromise both systems
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive encryption key from dedicated secret
 * Falls back to JWT_SECRET with warning for backward compatibility
 * @returns {Buffer} - 32-byte key
 */
function getEncryptionKey() {
    const secret = process.env.ENCRYPTION_KEY || env.jwt.secret;
    if (!process.env.ENCRYPTION_KEY) {
        console.warn('[SECURITY] ENCRYPTION_KEY not set — falling back to JWT_SECRET. Set a dedicated ENCRYPTION_KEY in production!');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a string value
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted string (iv:authTag:ciphertext in base64)
 */
function encrypt(text) {
    if (!text) return text;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedText - Encrypted string (iv:authTag:ciphertext)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;

    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted format');
        }

        const [ivBase64, authTagBase64, ciphertext] = parts;
        const key = getEncryptionKey();
        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        // Propagate specific error messages
        if (error.message === 'Invalid encrypted format') {
            throw error;
        }
        throw new Error('Failed to decrypt token');
    }
}

module.exports = {
    encrypt,
    decrypt
};
