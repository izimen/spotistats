/**
 * Stats Routes
 * Endpoints for listening statistics with caching
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/protect');
const { apiLimiter } = require('../middleware/rateLimiter');
const statsController = require('../controllers/statsController');

// All stats routes require authentication
router.use(protect);

// Apply API rate limiting
router.use(apiLimiter);

// Top Artists
router.get('/top-artists', statsController.getTopArtists);

// Top Tracks
router.get('/top-tracks', statsController.getTopTracks);

// Top Albums (derived from top tracks)
router.get('/top-albums', statsController.getTopAlbums);

// Recently Played
router.get('/recent', statsController.getRecentlyPlayed);

// Audio Features (energy, danceability, valence, etc.)
router.get('/audio-features', statsController.getAudioFeatures);

// Overview (aggregated stats from imports)
router.get('/overview', statsController.getOverview);

// Clear cache (force fresh data from Spotify)
router.post('/clear-cache', statsController.clearCache);

// ============================================
// Listening History (persistent collection)
// ============================================

// Get listening history paginated
router.get('/listening-history', statsController.getListeningHistory);

// Get aggregated chart data
router.get('/listening-history/chart', statsController.getListeningChart);

// Manually trigger sync
router.post('/listening-history/sync', statsController.syncListeningHistory);

// ============================================
// Algorithm Endpoints (V3)
// ============================================

// Music DNA - Real audio features analysis
router.get('/dna', statsController.getMusicDNA);

// Prediction - Time-contextual listening prediction
router.get('/prediction', statsController.getPredictionData);

// Discovery Roulette - New music recommendations
router.get('/discovery/roulette', statsController.getDiscoveryRoulette);

module.exports = router;
