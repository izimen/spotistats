/**
 * Environment Configuration
 * Validates and exports all environment variables
 */
const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_REDIRECT_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

// Validate required variables
const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  // Database
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,

  // Spotify OAuth
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL,

  // Cron / Cloud Scheduler
  cronSecretKey: process.env.CRON_SECRET_KEY || null
};
