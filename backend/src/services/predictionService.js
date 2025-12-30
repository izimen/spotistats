/**
 * Prediction Service
 * Predicts what artist user will listen to based on time context and history
 */
const prisma = require('../utils/prismaClient');

/**
 * Get time label in Polish
 */
function getTimeLabel(hour) {
    if (hour >= 5 && hour < 12) return 'rano';
    if (hour >= 12 && hour < 17) return 'po południu';
    if (hour >= 17 && hour < 22) return 'wieczorem';
    return 'w nocy';
}

/**
 * Get global top artist for user (fallback)
 */
async function getGlobalTopArtist(userId) {
    const result = await prisma.streamingHistory.groupBy({
        by: ['artistName'],
        where: { userId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1
    });

    return result[0]?.artistName || null;
}

/**
 * Get prediction for what user will listen to
 * Based on time context and listening history
 * @param {string} userId - User ID
 * @returns {object} Prediction with artist, time, and confidence
 */
async function getPrediction(userId) {
    try {
        const now = new Date();
        const hour = now.getHours();

        // Get history from last 30 days
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const history = await prisma.streamingHistory.findMany({
            where: {
                userId,
                playedAt: { gte: thirtyDaysAgo }
            },
            select: { artistName: true, playedAt: true }
        });

        if (history.length === 0) {
            // No history - try global top
            const topArtist = await getGlobalTopArtist(userId);
            return {
                artist: topArtist || 'Nieznany',
                time: getTimeLabel(hour),
                confidence: 30
            };
        }

        // Filter tracks played around this hour (±2h)
        const relevantTracks = history.filter(h => {
            const trackHour = new Date(h.playedAt).getHours();
            return Math.abs(trackHour - hour) <= 2 ||
                (hour <= 2 && trackHour >= 22) ||
                (hour >= 22 && trackHour <= 2);
        });

        if (relevantTracks.length < 3) {
            // Not enough context-specific data - use global top
            const topArtist = await getGlobalTopArtist(userId);
            return {
                artist: topArtist || 'Nieznany',
                time: getTimeLabel(hour),
                confidence: 50
            };
        }

        // Count artists in relevant time window
        const artistCounts = {};
        relevantTracks.forEach(t => {
            artistCounts[t.artistName] = (artistCounts[t.artistName] || 0) + 1;
        });

        // Find top artist
        const sorted = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]);
        const topArtist = sorted[0][0];
        const topCount = sorted[0][1];

        // Calculate confidence based on dominance
        const totalRelevant = relevantTracks.length;
        const dominance = topCount / totalRelevant;
        const confidence = Math.min(95, Math.round(50 + dominance * 45));

        return {
            artist: topArtist,
            time: getTimeLabel(hour),
            confidence
        };
    } catch (error) {
        console.error('[Prediction] Error:', error.message);
        return {
            artist: 'Nieznany',
            time: getTimeLabel(new Date().getHours()),
            confidence: 30
        };
    }
}

module.exports = {
    getPrediction,
    getTimeLabel,
    getGlobalTopArtist
};
