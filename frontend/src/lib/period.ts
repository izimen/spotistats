/**
 * Calendar periods for the Summary page. Dates are local YYYY-MM-DD strings;
 * `to` is exclusive (same contract as GET /stats/insights/summary).
 */

export type PeriodKind = 'month' | 'year';

export interface Period {
    kind: PeriodKind;
    /** first day, YYYY-MM-DD */
    from: string;
    /** day after the last day, YYYY-MM-DD */
    to: string;
}

const MONTHS = [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];
const MONTHS_GENITIVE = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date (browser timezone) as YYYY-MM-DD */
export function toLocalDateString(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parts(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    return { y, m, d };
}

export function periodContaining(kind: PeriodKind, date: Date = new Date()): Period {
    const y = date.getFullYear();
    if (kind === 'year') return { kind, from: `${y}-01-01`, to: `${y + 1}-01-01` };
    const m = date.getMonth() + 1;
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
    return { kind, from: `${y}-${pad(m)}-01`, to: next };
}

export function shiftPeriod(period: Period, steps: number): Period {
    const { y, m } = parts(period.from);
    if (period.kind === 'year') {
        return { kind: 'year', from: `${y + steps}-01-01`, to: `${y + steps + 1}-01-01` };
    }
    const index = y * 12 + (m - 1) + steps;
    const ny = Math.floor(index / 12);
    const nm = (index % 12) + 1;
    return periodContaining('month', new Date(ny, nm - 1, 1));
}

export function periodLabel(period: Period): string {
    const { y, m } = parts(period.from);
    return period.kind === 'year' ? String(y) : `${MONTHS[m - 1]} ${y}`;
}

/** "vs październik" / "vs 2025" */
export function previousPeriodLabel(period: Period): string {
    return periodLabel(shiftPeriod(period, -1));
}

export function isCurrentOrFuture(period: Period, today: Date = new Date()): boolean {
    return period.to > toLocalDateString(today);
}

/** "21 listopada 2026" */
export function formatDayLong(date: string): string {
    const { y, m, d } = parts(date);
    return `${d} ${MONTHS_GENITIVE[m - 1]} ${y}`;
}

/** "21 lis" */
export function formatDayShort(date: string): string {
    const { m, d } = parts(date);
    return `${d} ${MONTHS_GENITIVE[m - 1].slice(0, 3)}`;
}

export function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const min = minutes % 60;
    return min ? `${h} h ${min} min` : `${h} h`;
}

/** Polish plural: 1 dzień, 2 dni, 5 dni / 1 odtworzenie, 2 odtworzenia, 5 odtworzeń */
export function plural(n: number, one: string, few: string, many: string): string {
    if (n === 1) return one;
    const lastTwo = n % 100;
    const last = n % 10;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
    return many;
}
