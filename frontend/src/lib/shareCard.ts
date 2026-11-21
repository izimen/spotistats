/**
 * Share card: renders a period summary to a 1080x1350 PNG on a canvas (no backend).
 * Text only - album/artist covers come from Spotify's CDN and would taint the canvas
 * if CORS headers ever changed, so we don't depend on them.
 */
import type { PeriodSummary } from '@/hooks/useInsights';
import { formatMinutes } from './period';

const W = 1080;
const H = 1350;
const GREEN = '#1ed760';
const BG = '#0b0c0e';
const CARD = '#14161a';
const TEXT = '#fafafa';
const MUTED = '#8c8c8c';

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export function drawShareCard(canvas: HTMLCanvasElement, summary: PeriodSummary, periodTitle: string, userName?: string) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    const font = (weight: number, size: number) => `${weight} ${size}px Inter, "Segoe UI", system-ui, sans-serif`;

    // background + glow
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 900);
    glow.addColorStop(0, 'rgba(30, 215, 96, 0.35)');
    glow.addColorStop(1, 'rgba(30, 215, 96, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const pad = 80;
    let y = pad + 20;

    ctx.fillStyle = GREEN;
    ctx.font = font(700, 34);
    ctx.fillText('SpotiStats', pad, y);
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 34);
    ctx.textAlign = 'right';
    ctx.fillText(userName ? fit(ctx, userName, 500) : '', W - pad, y);
    ctx.textAlign = 'left';

    y += 110;
    ctx.fillStyle = TEXT;
    ctx.font = font(800, 84);
    ctx.fillText(fit(ctx, periodTitle, W - pad * 2), pad, y);

    // big minutes
    y += 150;
    ctx.fillStyle = GREEN;
    ctx.font = font(800, 150);
    ctx.fillText(summary.totals.minutes.toLocaleString('pl-PL'), pad, y);
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 40);
    y += 60;
    ctx.fillText(`minut muzyki · ${formatMinutes(summary.totals.minutes)}`, pad, y);

    // stat tiles
    y += 60;
    const tiles = [
        { value: summary.totals.plays.toLocaleString('pl-PL'), label: 'odtworzeń' },
        { value: summary.totals.uniqueArtists.toLocaleString('pl-PL'), label: 'artystów' },
        { value: String(summary.totals.activeDays), label: 'dni z muzyką' },
    ];
    const gap = 24;
    const tileW = (W - pad * 2 - gap * 2) / 3;
    tiles.forEach((t, i) => {
        const x = pad + i * (tileW + gap);
        ctx.fillStyle = CARD;
        roundRect(ctx, x, y, tileW, 150, 28);
        ctx.fill();
        ctx.fillStyle = TEXT;
        ctx.font = font(800, 56);
        ctx.fillText(fit(ctx, t.value, tileW - 56), x + 28, y + 75);
        ctx.fillStyle = MUTED;
        ctx.font = font(500, 30);
        ctx.fillText(t.label, x + 28, y + 120);
    });

    // top artists
    y += 230;
    ctx.fillStyle = TEXT;
    ctx.font = font(700, 44);
    ctx.fillText('Top artyści', pad, y);
    y += 30;
    summary.topArtists.slice(0, 5).forEach((a, i) => {
        y += 72;
        ctx.fillStyle = i === 0 ? GREEN : MUTED;
        ctx.font = font(800, 44);
        ctx.fillText(String(i + 1), pad, y);
        ctx.fillStyle = TEXT;
        ctx.font = font(i === 0 ? 700 : 500, 44);
        ctx.fillText(fit(ctx, a.name, W - pad * 2 - 280), pad + 70, y);
        ctx.fillStyle = MUTED;
        ctx.font = font(500, 32);
        ctx.textAlign = 'right';
        ctx.fillText(`${a.plays} odtw.`, W - pad, y);
        ctx.textAlign = 'left';
    });

    // top track
    const track = summary.topTracks[0];
    if (track) {
        y = Math.max(y + 70, H - 250);
        ctx.fillStyle = CARD;
        roundRect(ctx, pad, y, W - pad * 2, 130, 28);
        ctx.fill();
        ctx.fillStyle = MUTED;
        ctx.font = font(500, 28);
        ctx.fillText('Utwór okresu', pad + 32, y + 48);
        ctx.fillStyle = TEXT;
        ctx.font = font(700, 38);
        ctx.fillText(fit(ctx, `${track.name} — ${track.artist ?? ''}`, W - pad * 2 - 64), pad + 32, y + 98);
    }

    ctx.fillStyle = MUTED;
    ctx.font = font(500, 26);
    ctx.textAlign = 'center';
    ctx.fillText('Wygenerowano w SpotiStats', W / 2, H - 50);
    ctx.textAlign = 'left';
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
    });
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Native share sheet on phones (Web Share API with files), download elsewhere */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded'> {
    const file = new File([blob], filename, { type: blob.type });
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title });
            return 'shared';
        } catch (e) {
            if ((e as DOMException)?.name === 'AbortError') return 'shared'; // user closed the sheet
        }
    }
    downloadBlob(blob, filename);
    return 'downloaded';
}
