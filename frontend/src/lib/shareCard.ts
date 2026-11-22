/**
 * Share card: the period summary as a 1080x1350 gig poster (same look as the app's hero):
 * duotone photo of the #1 artist, their name in ultra-condensed Archivo, the numbers below.
 * Spotify's CDN sends CORS headers; if the image can't be loaded the poster is drawn without it.
 */
import type { PeriodSummary } from '@/hooks/useInsights';
import { formatMinutes, plural } from './period';

const W = 1080;
const H = 1350;
const PAD = 72;
const INK = '#16111D';
const PAPER = '#F3EEE6';
const MUTED = '#A197AD';
const LINE = '#3A3046';
const FAMILY = '"Archivo", system-ui, sans-serif';

/** Spotify CDN thumbnails (64/160/300 px) -> 640 px version of the same image */
export function largerSpotifyImage(url: string | null | undefined): string | null {
    if (!url) return null;
    return url
        .replace('ab67616d00004851', 'ab67616d0000b273')
        .replace('ab67616d00001e02', 'ab67616d0000b273')
        .replace('ab6761610000f178', 'ab6761610000e5eb')
        .replace('ab67616100005174', 'ab6761610000e5eb');
}

function cssAccent(): string {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    return v ? `hsl(${v})` : '#F2C94C';
}

function font(weight: number, size: number, condensed = false) {
    return `${condensed ? 'ultra-condensed ' : ''}${weight} ${size}px ${FAMILY}`;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
}

function loadImage(url: string | null): Promise<HTMLImageElement | null> {
    if (!url) return Promise.resolve(null);
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
        setTimeout(() => resolve(null), 4000);
    });
}

/** Cover-fit an image into a box, as a duotone: ink shadows, accent highlights */
function drawDuotone(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, accent: string) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale, sh = h / scale;
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, h);
    ctx.filter = 'grayscale(1) contrast(1.25) brightness(0.95)';
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

export async function drawShareCard(canvas: HTMLCanvasElement, summary: PeriodSummary, periodTitle: string, userName?: string) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    try {
        await Promise.all([document.fonts.load(font(900, 100, true)), document.fonts.load(font(500, 30))]);
    } catch {
        /* system font fallback */
    }

    const accent = cssAccent();
    const top = summary.topArtists[0];
    const photo = await loadImage(largerSpotifyImage(top?.image));

    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // masthead
    ctx.fillStyle = accent;
    ctx.font = font(900, 40, true);
    ctx.fillText('SpotiStats', PAD, PAD + 30);
    if (userName) {
        ctx.fillStyle = MUTED;
        ctx.font = font(500, 30);
        ctx.textAlign = 'right';
        ctx.fillText(ellipsize(ctx, userName, 520), W - PAD, PAD + 30);
        ctx.textAlign = 'left';
    }

    // photo block
    const photoY = PAD + 70;
    const photoH = 560;
    if (photo) drawDuotone(ctx, photo, PAD, photoY, W - PAD * 2, photoH, accent);
    else {
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.18;
        ctx.fillRect(PAD, photoY, W - PAD * 2, photoH);
        ctx.globalAlpha = 1;
    }

    // the name, fitted to the sheet and biting into the photo
    const name = top?.name ?? periodTitle;
    let size = 100;
    ctx.font = font(900, size, true);
    size = Math.min(300, Math.floor(size * ((W - PAD * 2) / ctx.measureText(name).width) * 0.98));
    ctx.font = font(900, size, true);
    if (ctx.measureText(name).width > W - PAD * 2) size = Math.max(60, size * ((W - PAD * 2) / ctx.measureText(name).width));
    ctx.font = font(900, size, true);
    const nameBaseline = photoY + photoH + size * 0.42;
    ctx.fillStyle = PAPER;
    ctx.fillText(name, PAD - size * 0.02, nameBaseline);

    // period line
    let y = nameBaseline + 78;
    ctx.fillStyle = accent;
    ctx.font = font(800, 50, true);
    ctx.fillText(`${periodTitle} · ${top ? `${top.plays} ${plural(top.plays, 'odtworzenie', 'odtworzenia', 'odtworzeń')}` : ''}`, PAD, y);

    // numbers
    y += 40;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    const figures = [
        { value: formatMinutes(summary.totals.minutes), label: 'muzyki' },
        { value: summary.totals.plays.toLocaleString('pl-PL'), label: 'odtworzeń' },
        { value: summary.totals.uniqueArtists.toLocaleString('pl-PL'), label: 'artystów' },
    ];
    const colW = (W - PAD * 2) / 3;
    figures.forEach((f, i) => {
        const x = PAD + i * colW;
        ctx.fillStyle = PAPER;
        ctx.font = font(800, 64, true);
        ctx.fillText(ellipsize(ctx, f.value, colW - 24), x, y + 84);
        ctx.fillStyle = MUTED;
        ctx.font = font(500, 28);
        ctx.fillText(f.label, x, y + 124);
    });

    // runners-up
    y += 190;
    const rest = summary.topArtists.slice(1, 4);
    rest.forEach((a, i) => {
        ctx.fillStyle = MUTED;
        ctx.font = font(800, 40, true);
        ctx.fillText(String(i + 2), PAD, y + i * 52);
        ctx.fillStyle = PAPER;
        ctx.font = font(600, 36);
        ctx.fillText(ellipsize(ctx, a.name, W - PAD * 2 - 220), PAD + 56, y + i * 52);
        ctx.fillStyle = MUTED;
        ctx.font = font(500, 28);
        ctx.textAlign = 'right';
        ctx.fillText(`${a.plays}×`, W - PAD, y + i * 52);
        ctx.textAlign = 'left';
    });

    ctx.fillStyle = MUTED;
    ctx.font = font(500, 24);
    ctx.fillText('spotistats · dane ze Spotify', PAD, H - 44);
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
