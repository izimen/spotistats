/**
 * "Wears your music": the accent colour comes from the user's #1 artist image.
 *
 * - 32×32 canvas sample, skip near-black / near-white / grey pixels, dominant hue bucket
 * - clamped in OKLCH (L 0.72–0.88, C 0.08–0.18) so text on ink stays ≥ 4.5:1
 * - hues near Spotify green are rotated 40° away (green is reserved for Spotify actions)
 * - cached per image URL; any failure -> sodium yellow default
 */

export const DEFAULT_ACCENT = '#F2C94C';
const INK = '#16111D';
const SPOTIFY_GREEN = '#1ED760';
const CACHE_PREFIX = 'spotistats:accent:v1:';

type RGB = [number, number, number];
type OKLCH = { l: number; c: number; h: number };

// ---------- colour maths (sRGB <-> OKLab) ----------

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function rgbToOklch([r8, g8, b8]: RGB): OKLCH {
    const r = toLinear(r8 / 255), g = toLinear(g8 / 255), b = toLinear(b8 / 255);
    const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    const h = (Math.atan2(B, A) * 180) / Math.PI;
    return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

/** Returns linear-free sRGB 0..1 (may be out of gamut) */
function oklchToRgbUnclamped({ l, c, h }: OKLCH): [number, number, number] {
    const A = c * Math.cos((h * Math.PI) / 180);
    const B = c * Math.sin((h * Math.PI) / 180);
    const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [
        toGamma(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
        toGamma(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
        toGamma(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
    ];
}

const inGamut = (rgb: number[]) => rgb.every(v => v >= -0.001 && v <= 1.001);

/** OKLCH -> sRGB, reducing chroma until it fits the gamut */
function oklchToRgb(color: OKLCH): RGB {
    let c = color.c;
    let rgb = oklchToRgbUnclamped({ ...color, c });
    while (!inGamut(rgb) && c > 0) {
        c = Math.max(0, c - 0.005);
        rgb = oklchToRgbUnclamped({ ...color, c });
    }
    return rgb.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255)) as RGB;
}

export function hexToRgb(hex: string): RGB {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function luminance([r, g, b]: RGB): number {
    return 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);
}

export function contrastRatio(a: RGB, b: RGB): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

export function rgbToHslTriplet([r8, g8, b8]: RGB): string {
    const r = r8 / 255, g = g8 / 255, b = b8 / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
    }
    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const hueDistance = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
};

// ---------- palette rules ----------

/** Clamp a sampled colour into a usable, legible, non-Spotify accent */
export function normaliseAccent(sample: RGB): string {
    const color = rgbToOklch(sample);
    const spotifyHue = rgbToOklch(hexToRgb(SPOTIFY_GREEN)).h;
    if (hueDistance(color.h, spotifyHue) < 25) {
        // rotate away from the brand green, towards whichever side is nearer
        const sign = ((color.h - spotifyHue + 540) % 360) - 180 >= 0 ? 1 : -1;
        color.h = (color.h + sign * 40 + 360) % 360;
    }
    color.l = Math.min(0.88, Math.max(0.72, color.l));
    color.c = Math.min(0.18, Math.max(0.08, color.c));

    const ink = hexToRgb(INK);
    let rgb = oklchToRgb(color);
    while (contrastRatio(rgb, ink) < 4.5 && color.l < 0.95) {
        color.l += 0.02;
        rgb = oklchToRgb(color);
    }
    return rgbToHex(rgb);
}

/** Dominant chromatic colour of an image's pixels (RGBA array) */
export function dominantColor(pixels: Uint8ClampedArray): RGB | null {
    const BUCKETS = 24;
    const weight = new Array(BUCKETS).fill(0);
    const sums = Array.from({ length: BUCKETS }, () => ({ x: 0, y: 0, l: 0, c: 0, n: 0 }));

    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 128) continue;
        const col = rgbToOklch([pixels[i], pixels[i + 1], pixels[i + 2]]);
        if (col.l < 0.2 || col.l > 0.95 || col.c < 0.04) continue;
        const bucket = Math.floor(col.h / (360 / BUCKETS)) % BUCKETS;
        weight[bucket] += col.c;
        const s = sums[bucket];
        s.x += Math.cos((col.h * Math.PI) / 180);
        s.y += Math.sin((col.h * Math.PI) / 180);
        s.l += col.l;
        s.c += col.c;
        s.n += 1;
    }

    const best = weight.indexOf(Math.max(...weight));
    const s = sums[best];
    if (!s || s.n < 6) return null; // essentially a greyscale image
    let h = (Math.atan2(s.y, s.x) * 180) / Math.PI;
    if (h < 0) h += 360;
    return oklchToRgb({ l: s.l / s.n, c: s.c / s.n, h });
}

// ---------- extraction ----------

function readCache(url: string): string | null {
    try {
        return localStorage.getItem(CACHE_PREFIX + url);
    } catch {
        return null;
    }
}

function writeCache(url: string, hex: string) {
    try {
        localStorage.setItem(CACHE_PREFIX + url, hex);
    } catch {
        /* storage full / disabled - not important */
    }
}

export function cachedAccent(url: string | null | undefined): string | null {
    return url ? readCache(url) : null;
}

/** Accent for an image URL (cached). Resolves to DEFAULT_ACCENT on any failure. */
export function extractAccent(url: string | null | undefined): Promise<string> {
    if (!url) return Promise.resolve(DEFAULT_ACCENT);
    const cached = readCache(url);
    if (cached) return Promise.resolve(cached);

    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 32;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return resolve(DEFAULT_ACCENT);
                ctx.drawImage(img, 0, 0, 32, 32);
                const sample = dominantColor(ctx.getImageData(0, 0, 32, 32).data);
                const hex = sample ? normaliseAccent(sample) : DEFAULT_ACCENT;
                writeCache(url, hex);
                resolve(hex);
            } catch {
                resolve(DEFAULT_ACCENT); // tainted canvas
            }
        };
        img.onerror = () => resolve(DEFAULT_ACCENT);
        img.src = url;
    });
}

/** Apply accent + 6% page tint to the document */
export function applyAccent(hex: string) {
    const accent = hexToRgb(hex);
    const ink = hexToRgb(INK);
    const tint = ink.map((v, i) => Math.round(v + (accent[i] - v) * 0.06)) as RGB;
    const root = document.documentElement.style;
    root.setProperty('--primary', rgbToHslTriplet(accent));
    root.setProperty('--background', rgbToHslTriplet(tint));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', rgbToHex(tint));
}
