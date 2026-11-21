/**
 * Insights Controller
 * Period summary ("Wrapped" on demand), listening calendar and CSV export.
 */
const insightsService = require('../services/insightsService');

const { isValidDate, addMonths, daysBetween, localToday } = insightsService._internal;

const MAX_RANGE_DAYS = 3660; // ~10 years
const MAX_CALENDAR_DAYS = 730;

/**
 * Resolve ?from=YYYY-MM-DD&to=YYYY-MM-DD (to exclusive, local dates).
 * Defaults to the current calendar month.
 */
function resolveRange(query) {
    const { from, to } = query;
    if (from === undefined && to === undefined) {
        const monthStart = `${localToday().slice(0, 7)}-01`;
        return { from: monthStart, to: addMonths(monthStart, 1) };
    }
    if (!isValidDate(from) || !isValidDate(to)) {
        return { error: 'from and to must be dates in YYYY-MM-DD format' };
    }
    const days = daysBetween(from, to);
    if (days <= 0) return { error: 'to must be after from' };
    if (days > MAX_RANGE_DAYS) return { error: `Range too long (max ${MAX_RANGE_DAYS} days)` };
    return { from, to };
}

// GET /api/v1/stats/insights/summary?from=&to=
async function getSummary(req, res, next) {
    try {
        const range = resolveRange(req.query);
        if (range.error) {
            return res.status(400).json({ success: false, error: range.error });
        }
        const data = await insightsService.getPeriodSummary(req.user.id, range.from, range.to);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

// GET /api/v1/stats/insights/calendar?days=365
async function getCalendar(req, res, next) {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days, 10) || 365, 7), MAX_CALENDAR_DAYS);
        const data = await insightsService.getCalendar(req.user.id, days);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

// GET /api/v1/stats/listening-history/export -> text/csv (streamed)
async function exportHistory(req, res, next) {
    try {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="spotistats-history-${localToday()}.csv"`);
        res.setHeader('Cache-Control', 'no-store');
        await insightsService.exportHistoryCsv(req.user.id, (chunk) => res.write(chunk));
        res.end();
    } catch (error) {
        if (!res.headersSent) return next(error);
        // headers already sent - just cut the stream so the client sees a failed download
        console.error('[Insights] CSV export failed mid-stream:', error.message);
        res.destroy(error);
    }
}

module.exports = {
    getSummary,
    getCalendar,
    exportHistory,
    _resolveRange: resolveRange,
};
