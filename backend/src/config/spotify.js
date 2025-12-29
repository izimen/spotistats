/**
 * Spotify API Configuration
 * OAuth scopes and endpoints
 */

// Spotify OAuth scopes needed for the application
const SCOPES = [
    'user-read-email',
    'user-read-private',
    'user-top-read',
    'user-read-recently-played',
    'user-library-read'
];

// Spotify API endpoints
const ENDPOINTS = {
    authorize: 'https://accounts.spotify.com/authorize',
    token: 'https://accounts.spotify.com/api/token',
    userProfile: 'https://api.spotify.com/v1/me'
};

module.exports = {
    SCOPES,
    ENDPOINTS,
    SCOPES_STRING: SCOPES.join(' ')
};
