/**
 * Server Entry Point
 * Starts the Express server with graceful shutdown
 */
const app = require('./app');
const env = require('./config/env');
const prisma = require('./utils/prismaClient');

const PORT = env.port;

// Start server
const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║           🎵 SpotiStats Backend Server 🎵         ║
╠═══════════════════════════════════════════════════╣
║  Environment: ${env.nodeEnv.padEnd(35)}║
║  Port: ${PORT.toString().padEnd(41)}║
║  Frontend: ${env.frontendUrl.padEnd(38)}║
╚═══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        console.log('HTTP server closed.');

        // Disconnect Prisma
        await prisma.$disconnect();
        console.log('Database connection closed.');

        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
