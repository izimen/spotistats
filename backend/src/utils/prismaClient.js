/**
 * Prisma Client Singleton
 * Ensures only one instance of PrismaClient is created
 */
const { PrismaClient } = require('@prisma/client');

// Global Prisma instance for hot reloading in development
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

module.exports = prisma;
