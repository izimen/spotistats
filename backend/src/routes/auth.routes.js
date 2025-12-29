/**
 * Auth Routes
 * OAuth2 + PKCE authentication endpoints
 */
const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/protect');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

// Public routes with rate limiting
router.get('/login', authLimiter, authController.login);
router.get('/callback', authLimiter, authController.callback);

// Protected routes
router.post('/refresh', protect, authController.refresh);
router.post('/logout', optionalAuth, authController.logout); // optionalAuth to handle missing token gracefully
router.get('/me', protect, authController.me);

// GDPR: Delete account
router.delete('/me', protect, authController.deleteAccount);

module.exports = router;
