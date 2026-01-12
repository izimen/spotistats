/**
 * Prediction Service
 * Predicts what artist user will listen to based on multiple factors:
 * - Time of day patterns (±2h window)
 * - Day of week patterns (weekday vs weekend)
 * - Sample size (more data = higher confidence)
 * - Consistency across different days
 * - Recency weighting (recent listens count more)
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
 * Check if date is weekend (Saturday or Sunday)
 */
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
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
 * Calculate recency weight - tracks from recent days count more
 * @param {Date} trackDate - When the track was played
 * @param {Date} now - Current time
 * @returns {number} Weight between 0.5 and 1.0
 */
function getRecencyWeight(trackDate, now) {
    const daysDiff = (now.getTime() - trackDate.getTime()) / (1000 * 60 * 60 * 24);
    // Recent tracks (0-7 days) get weight 1.0, older tracks (21-30 days) get weight 0.5
    return Math.max(0.5, 1 - (daysDiff / 60));
}

/**
 * Get prediction for what user will listen to
 * Based on multiple factors and listening history
 * @param {string} userId - User ID
 * @returns {object} Prediction with artist, time, confidence, and factors breakdown
 */
async function getPrediction(userId) {
    try {
        const now = new Date();
        const hour = now.getHours();
        const currentIsWeekend = isWeekend(now);

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
            const topArtist = await getGlobalTopArtist(userId);
            return {
                artist: topArtist || 'Nieznany',
                time: getTimeLabel(hour),
                confidence: 25,
                factors: { noData: true }
            };
        }

        // Filter tracks by time window (±2h)
        const timeRelevantTracks = history.filter(h => {
            const trackHour = new Date(h.playedAt).getHours();
            return Math.abs(trackHour - hour) <= 2 ||
                (hour <= 2 && trackHour >= 22) ||
                (hour >= 22 && trackHour <= 2);
        });

        // Filter tracks by matching day type (weekday/weekend)
        const dayTypeRelevantTracks = timeRelevantTracks.filter(h => {
            return isWeekend(new Date(h.playedAt)) === currentIsWeekend;
        });

        // Use day-type filtered if enough data, otherwise fall back to time-only
        const relevantTracks = dayTypeRelevantTracks.length >= 5
            ? dayTypeRelevantTracks
            : timeRelevantTracks;

        if (relevantTracks.length < 3) {
            const topArtist = await getGlobalTopArtist(userId);
            return {
                artist: topArtist || 'Nieznany',
                time: getTimeLabel(hour),
                confidence: 35,
                factors: { lowSampleSize: true, sampleSize: relevantTracks.length }
            };
        }

        // Count artists with recency weighting
        const artistScores = {};
        const artistDays = {}; // Track unique days per artist

        relevantTracks.forEach(t => {
            const trackDate = new Date(t.playedAt);
            const weight = getRecencyWeight(trackDate, now);
            const dateKey = trackDate.toDateString();

            if (!artistScores[t.artistName]) {
                artistScores[t.artistName] = 0;
                artistDays[t.artistName] = new Set();
            }
            artistScores[t.artistName] += weight;
            artistDays[t.artistName].add(dateKey);
        });

        // Find top artist by weighted score
        const sorted = Object.entries(artistScores).sort((a, b) => b[1] - a[1]);
        const topArtist = sorted[0][0];
        const topScore = sorted[0][1];
        const totalScore = Object.values(artistScores).reduce((a, b) => a + b, 0);

        // === FACTOR 1: Time-based dominance (25% of confidence) ===
        const dominance = topScore / totalScore;
        const dominanceFactor = dominance * 25;

        // === FACTOR 2: Day of week match (20% of confidence) ===
        const dayTypeMatch = dayTypeRelevantTracks.length >= 5;
        const dayTypeFactor = dayTypeMatch ? 20 : 10;

        // === FACTOR 3: Sample size (20% of confidence) ===
        // More tracks in the time window = more reliable prediction
        const sampleSizeFactor = Math.min(20, (relevantTracks.length / 30) * 20);

        // === FACTOR 4: Consistency across days (20% of confidence) ===
        // Artist appearing on multiple different days = more consistent pattern
        const uniqueDays = artistDays[topArtist]?.size || 1;
        const totalUniqueDays = new Set(relevantTracks.map(t => new Date(t.playedAt).toDateString())).size;
        const consistencyRatio = uniqueDays / Math.max(1, totalUniqueDays);
        const consistencyFactor = consistencyRatio * 20;

        // === FACTOR 5: Competition (15% of confidence) ===
        // If there's a clear winner vs close competition
        const secondScore = sorted[1]?.[1] || 0;
        const competitionGap = secondScore > 0 ? (topScore - secondScore) / topScore : 1;
        const competitionFactor = competitionGap * 15;

        // Calculate final confidence (range: ~25% to ~88%)
        const rawConfidence = dominanceFactor + dayTypeFactor + sampleSizeFactor + consistencyFactor + competitionFactor;
        const confidence = Math.round(Math.max(25, Math.min(88, rawConfidence)));

        return {
            artist: topArtist,
            time: getTimeLabel(hour),
            confidence,
            factors: {
                dominance: Math.round(dominanceFactor),
                dayTypeMatch: Math.round(dayTypeFactor),
                sampleSize: Math.round(sampleSizeFactor),
                consistency: Math.round(consistencyFactor),
                competition: Math.round(competitionFactor),
                totalTracks: relevantTracks.length,
                uniqueDays,
                isWeekend: currentIsWeekend
            }
        };
    } catch (error) {
        console.error('[Prediction] Error:', error.message);
        return {
            artist: 'Nieznany',
            time: getTimeLabel(new Date().getHours()),
            confidence: 25,
            factors: { error: true }
        };
    }
}

module.exports = {
    getPrediction,
    getTimeLabel,
    getGlobalTopArtist,
    isWeekend,
    getRecencyWeight
};
