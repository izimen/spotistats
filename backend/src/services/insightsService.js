/**
 * Insights Service
 * Period summaries ("Wrapped" for any month/year/range), listening calendar with streaks
 * and CSV export. Everything is computed from our own StreamingHistory table, so none of it
 * depends on Spotify endpoints that dev-mode apps lost in 2024-2026.
 *
 * Dates coming from the client are LOCAL calendar dates (YYYY-MM-DD, APP_TIMEZONE).
 * playedAt is stored as UTC, so boundaries are converted to UTC in SQL - that keeps the
 * (userId, playedAt) index usable.
 */

const prisma = require('../utils/prismaClient');
const { Prisma } = require('@prisma/client');
const env = require('../config/env');

const TOP_LIMIT = 10;
const NIGHT_FROM = 22; // 22:00-05:59 counts as night
const NIGHT_TO = 6;

const localPlayedAt = () => Prisma.sql`("playedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${env.appTimezone})`;
// local date string -> UTC timestamp (start of that local day)
const utcStartOf = (date) => Prisma.sql`((${date}::timestamp AT TIME ZONE ${env.appTimezone}) AT TIME ZONE 'UTC')`;
const inRange = (from, to) => Prisma.sql`"playedAt" >= ${utcStartOf(from)} AND "playedAt" < ${utcStartOf(to)}`;

// ---------- date helpers (pure, on YYYY-MM-DD strings) ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(str) {
    if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
    const d = new Date(`${str}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

function addDays(str, n) {
    const d = new Date(`${str}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function addMonths(str, n) {
    const d = new Date(`${str}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
    return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);
}

/** Today's date in the app timezone */
function localToday() {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: env.appTimezone }).format(new Date());
}

/**
 * Period right before [from, to): previous calendar month/year when the range is exactly
 * one month/year, otherwise a window of the same length.
 */
function previousPeriod(from, to) {
    if (from.endsWith('-01') && addMonths(from, 1) === to) {
        return { from: addMonths(from, -1), to: from };
    }
    if (from.endsWith('-01-01') && addMonths(from, 12) === to) {
        return { from: addMonths(from, -12), to: from };
    }
    const len = daysBetween(from, to);
    return { from: addDays(from, -len), to: from };
}

/**
 * Streaks from a sorted list of distinct local dates (YYYY-MM-DD).
 * current = streak that ends today or yesterday (yesterday keeps it alive until the day ends).
 */
function computeStreaks(sortedDates, today = localToday()) {
    let longest = { length: 0, from: null, to: null };
    let run = null;
    for (const date of sortedDates) {
        if (run && addDays(run.to, 1) === date) {
            run.to = date;
            run.length++;
        } else {
            run = { length: 1, from: date, to: date };
        }
        if (run.length > longest.length) longest = { ...run };
    }
    const alive = run && (run.to === today || run.to === addDays(today, -1));
    return {
        longest,
        current: alive ? { ...run } : { length: 0, from: null, to: null },
    };
}

// ---------- queries ----------

async function getTotals(userId, from, to) {
    const local = localPlayedAt();
    const [row] = await prisma.$queryRaw`
        SELECT
            COUNT(*)::int AS plays,
            COALESCE(SUM("msPlayed"), 0)::bigint AS ms,
            COUNT(DISTINCT "artistName")::int AS artists,
            COUNT(DISTINCT ("trackName", "artistName"))::int AS tracks,
            COUNT(DISTINCT (${local})::date)::int AS "activeDays",
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM ${local}) >= ${NIGHT_FROM}
                                OR EXTRACT(HOUR FROM ${local}) < ${NIGHT_TO})::int AS night,
            COUNT(*) FILTER (WHERE EXTRACT(ISODOW FROM ${local}) >= 6)::int AS weekend
        FROM "StreamingHistory"
        WHERE "userId" = ${userId} AND ${inRange(from, to)}
    `;
    return {
        plays: row?.plays || 0,
        minutes: Math.round(Number(row?.ms || 0) / 60000),
        uniqueArtists: row?.artists || 0,
        uniqueTracks: row?.tracks || 0,
        activeDays: row?.activeDays || 0,
        nightPlays: row?.night || 0,
        weekendPlays: row?.weekend || 0,
    };
}

function getTopArtists(userId, from, to) {
    return prisma.$queryRaw`
        SELECT "artistName" AS name, COUNT(*)::int AS plays,
               (SUM("msPlayed") / 60000)::int AS minutes, MAX("albumImage") AS image
        FROM "StreamingHistory"
        WHERE "userId" = ${userId} AND ${inRange(from, to)}
        GROUP BY "artistName"
        ORDER BY plays DESC, minutes DESC
        LIMIT ${TOP_LIMIT}
    `;
}

function getTopTracks(userId, from, to) {
    return prisma.$queryRaw`
        SELECT "trackName" AS name, "artistName" AS artist, COUNT(*)::int AS plays,
               (SUM("msPlayed") / 60000)::int AS minutes, MAX("albumImage") AS image,
               MAX("spotifyUri") AS uri
        FROM "StreamingHistory"
        WHERE "userId" = ${userId} AND ${inRange(from, to)}
        GROUP BY "trackName", "artistName"
        ORDER BY plays DESC, minutes DESC
        LIMIT ${TOP_LIMIT}
    `;
}

/** Artists played in the range that never appear before it */
function getNewArtists(userId, from, to) {
    return prisma.$queryRaw`
        SELECT s."artistName" AS name, COUNT(*)::int AS plays, MIN(s."playedAt") AS "firstPlayedAt",
               MAX(s."albumImage") AS image, (COUNT(*) OVER ())::int AS total,
               (SUM(COUNT(*)) OVER ())::int AS "totalPlays"
        FROM "StreamingHistory" s
        WHERE s."userId" = ${userId} AND ${inRange(from, to)}
        GROUP BY s."artistName"
        HAVING NOT EXISTS (
            SELECT 1 FROM "StreamingHistory" p
            WHERE p."userId" = ${userId} AND p."artistName" = s."artistName"
              AND p."playedAt" < ${utcStartOf(from)}
        )
        ORDER BY plays DESC
        LIMIT ${TOP_LIMIT}
    `;
}

/** Plays per local day. Without from/to: whole history. */
async function getDailyCounts(userId, from, to) {
    const local = localPlayedAt();
    const rows = await prisma.$queryRaw`
        SELECT to_char((${local})::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS plays,
               (SUM("msPlayed") / 60000)::int AS minutes
        FROM "StreamingHistory"
        WHERE "userId" = ${userId}
        ${from && to ? Prisma.sql`AND ${inRange(from, to)}` : Prisma.empty}
        GROUP BY 1
        ORDER BY 1
    `;
    return rows.map(r => ({ date: r.date, plays: r.plays, minutes: r.minutes }));
}

async function getDataRange(userId) {
    const agg = await prisma.streamingHistory.aggregate({
        where: { userId },
        _min: { playedAt: true },
        _max: { playedAt: true },
    });
    return { first: agg._min.playedAt || null, last: agg._max.playedAt || null };
}

function ratio(part, total) {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

function percentChange(current, previous) {
    if (!previous) return null; // no baseline -> no fake percentage
    return Math.round(((current - previous) / previous) * 100);
}

/**
 * Summary of a local date range [from, to).
 */
async function getPeriodSummary(userId, from, to) {
    const prev = previousPeriod(from, to);

    const [totals, previous, topArtists, topTracks, newArtists, days, dataRange] = await Promise.all([
        getTotals(userId, from, to),
        getTotals(userId, prev.from, prev.to),
        getTopArtists(userId, from, to),
        getTopTracks(userId, from, to),
        getNewArtists(userId, from, to),
        getDailyCounts(userId, from, to),
        getDataRange(userId),
    ]);

    const streaks = computeStreaks(days.map(d => d.date), addDays(to, -1));
    const busiestDay = days.reduce((best, d) => (!best || d.plays > best.plays ? d : best), null);
    const newArtistCount = newArtists[0]?.total || 0;
    const newArtistPlays = newArtists[0]?.totalPlays || 0;
    const topArtistPlays = topArtists[0]?.plays || 0;

    return {
        period: { from, to, days: daysBetween(from, to) },
        previousPeriod: prev,
        dataRange,
        totals,
        previous: {
            plays: previous.plays,
            minutes: previous.minutes,
            uniqueArtists: previous.uniqueArtists,
            uniqueTracks: previous.uniqueTracks,
            activeDays: previous.activeDays,
        },
        change: {
            plays: percentChange(totals.plays, previous.plays),
            minutes: percentChange(totals.minutes, previous.minutes),
            uniqueArtists: percentChange(totals.uniqueArtists, previous.uniqueArtists),
            activeDays: percentChange(totals.activeDays, previous.activeDays),
        },
        topArtists,
        topTracks,
        newArtists: {
            count: newArtistCount,
            items: newArtists.map(({ total, totalPlays, ...a }) => a),
        },
        // Listener profile - plain percentages of real plays (replaces the old heuristic "Music DNA")
        profile: {
            variety: ratio(totals.uniqueArtists, totals.plays),      // distinct artists per 100 plays
            repeat: totals.plays > 0 ? 100 - ratio(totals.uniqueTracks, totals.plays) : 0,
            loyalty: ratio(topArtistPlays, totals.plays),            // share of the #1 artist
            discovery: ratio(newArtistPlays, totals.plays),          // plays of first-time artists
            night: ratio(totals.nightPlays, totals.plays),
            weekend: ratio(totals.weekendPlays, totals.plays),
        },
        streaks: { longestInPeriod: streaks.longest },
        busiestDay,
        days,
    };
}

/**
 * Listening calendar: daily counts for the last `days` days + all-time streaks.
 */
async function getCalendar(userId, days = 365) {
    const all = await getDailyCounts(userId);
    const today = localToday();
    const streaks = computeStreaks(all.map(d => d.date), today);
    const since = addDays(today, -(days - 1));
    const recent = all.filter(d => d.date >= since);

    return {
        from: since,
        to: today,
        days: recent,
        activeDays: recent.length,
        streaks,
    };
}

// ---------- CSV export ----------

const CSV_COLUMNS = ['playedAt', 'trackName', 'artistName', 'albumName', 'msPlayed', 'source', 'spotifyUri'];
const EXPORT_BATCH = 5000;

function csvCell(value) {
    if (value === null || value === undefined) return '';
    let str = value instanceof Date ? value.toISOString() : String(value);
    // Formula injection guard for spreadsheet apps
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    if (/[",\n\r]/.test(str)) str = `"${str.replace(/"/g, '""')}"`;
    return str;
}

/**
 * Stream the user's whole history as CSV. Keyset pagination keeps memory flat
 * even for large GDPR imports.
 * @param {string} userId
 * @param {(chunk: string) => void} write
 * @returns {Promise<number>} rows written
 */
async function exportHistoryCsv(userId, write) {
    write('﻿' + CSV_COLUMNS.join(',') + '\n'); // BOM so Excel reads UTF-8 (Polish characters)
    let cursor = null;
    let rows = 0;
    for (;;) {
        const batch = await prisma.streamingHistory.findMany({
            where: { userId },
            orderBy: [{ playedAt: 'asc' }, { id: 'asc' }],
            take: EXPORT_BATCH,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: { id: true, playedAt: true, trackName: true, artistName: true, albumName: true, msPlayed: true, source: true, spotifyUri: true },
        });
        if (batch.length === 0) break;
        write(batch.map(r => CSV_COLUMNS.map(c => csvCell(r[c])).join(',')).join('\n') + '\n');
        rows += batch.length;
        if (batch.length < EXPORT_BATCH) break;
        cursor = batch[batch.length - 1].id;
    }
    return rows;
}

module.exports = {
    getPeriodSummary,
    getCalendar,
    exportHistoryCsv,
    // exported for tests
    _internal: { isValidDate, addDays, addMonths, daysBetween, previousPeriod, computeStreaks, csvCell, localToday },
};
