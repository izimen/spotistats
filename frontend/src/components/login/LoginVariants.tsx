import type { CSSProperties, ReactNode } from "react";
import "./login.css";

export interface LoginVariantProps {
    error: ReactNode;
    onLogin: () => void;
}

/* deterministic "random" so the bars don't jump between renders */
const rnd = (i: number, salt = 1) => {
    const x = Math.sin(i * 12.9898 * salt + 78.233) * 43758.5453;
    return x - Math.floor(x);
};

const SpotifyMark = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
    </svg>
);

export const LoginButton = ({ onLogin }: { onLogin: () => void }) => (
    <button
        type="button"
        onClick={onLogin}
        className="login-cta touch-target inline-flex items-center gap-3 rounded-full bg-spotify px-7 py-3 text-base font-bold text-ink transition-[filter,transform] hover:brightness-110 active:scale-[.98]"
    >
        <SpotifyMark />
        Zaloguj się przez Spotify
    </button>
);

const Fineprint = () => (
    <p className="max-w-[70ch] text-sm text-muted-foreground">
        Potrzebujesz konta Spotify, dodanego przez właściciela aplikacji. Logujesz się na stronie Spotify, nie widzimy Twojego hasła.
        SpotiStats nie jest powiązany ze Spotify.
    </p>
);

const Pitch = ({ className = "" }: { className?: string }) => (
    <p className={`max-w-[46ch] text-lg text-muted-foreground ${className}`}>
        Twoi top artyści i utwory, historia słuchania zapisywana co godzinę i podsumowanie każdego miesiąca.
    </p>
);

/* ------------------------------------------------------------------ */
/* 1. Equalizer — the wordmark itself is the level meter               */
/* ------------------------------------------------------------------ */
const WORD = "SpotiStats";

export const EqualizerLogin = ({ error, onLogin }: LoginVariantProps) => {
    const bars = Array.from({ length: 64 }, (_, i) => i);
    return (
        <main className="eq-stage flex min-h-[100svh] flex-col justify-between bg-background px-5 py-8 sm:px-10 lg:px-16">
            <p className="text-sm text-muted-foreground">Statystyki słuchania ze Spotify</p>

            <div className="pt-[10svh] pb-10 sm:py-10">
                <h1 aria-label={WORD} className="type-poster flex flex-wrap text-[33vw] leading-[0.82] text-primary sm:text-[clamp(4.25rem,19vw,16rem)]">
                    {WORD.split("").map((ch, i) => (
                        <span
                            key={i}
                            aria-hidden="true"
                            data-ch={ch}
                            className="eq-letter"
                            style={{
                                "--d": `${0.55 + rnd(i) * 0.8}s`,
                                "--delay": `${-rnd(i, 3) * 2}s`,
                                "--lo": `${Math.round(55 + rnd(i, 5) * 35)}%`,
                                "--hi": `${Math.round(rnd(i, 7) * 18)}%`,
                                "--mid": `${Math.round(25 + rnd(i, 8) * 30)}%`,
                            } as CSSProperties}
                        >
                            {ch}
                        </span>
                    )).flatMap((el, i) => (i === 4 ? [el, <span key="br" aria-hidden="true" className="basis-full sm:hidden" />] : [el]))}
                </h1>

                {/* spectrum: a quiet echo of the wordmark */}
                <div aria-hidden="true" className="mt-6 flex h-16 items-end gap-[3px] sm:h-20">
                    {bars.map(i => (
                        <span
                            key={i}
                            className={`eq-bar h-full flex-1 ${i % 11 === 4 ? "bg-primary" : "bg-foreground/15"}`}
                            style={{
                                "--d": `${0.45 + rnd(i, 2) * 0.8}s`,
                                "--delay": `${-rnd(i, 9) * 1.5}s`,
                                "--lo": (0.06 + rnd(i, 4) * 0.2).toFixed(2),
                                "--hi": (0.35 + rnd(i, 6) * 0.65).toFixed(2),
                            } as CSSProperties}
                        />
                    ))}
                </div>

                <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <Pitch />
                    <div>
                        {error}
                        <LoginButton onLogin={onLogin} />
                    </div>
                </div>
            </div>

            <Fineprint />
        </main>
    );
};

/* ------------------------------------------------------------------ */
/* 2. Vinyl — a record spins; hovering the button drops the needle     */
/* ------------------------------------------------------------------ */
const LABEL_TEXT = "SpotiStats  ✦  Twoja muzyka w liczbach  ✦  ";

export const VinylLogin = ({ error, onLogin }: LoginVariantProps) => (
    <main className="vinyl-stage relative flex min-h-[100svh] flex-col overflow-hidden bg-background px-5 py-8 sm:px-10 lg:px-16">
        <p className="relative z-10 text-sm text-muted-foreground">Statystyki słuchania ze Spotify</p>

        <div className="relative z-10 grid flex-1 items-center gap-10 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* record */}
            <div className="relative order-first mx-auto w-[min(82vw,420px)] md:order-last md:mx-0 md:w-[min(46vw,620px)] md:justify-self-end">
                <div className="relative aspect-square">
                    <div className="vinyl-disc vinyl-spin absolute inset-0 rounded-full">
                        {/* label */}
                        <div className="absolute inset-[31%] rounded-full bg-primary">
                            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
                                <defs>
                                    <path id="vinyl-label-path" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
                                </defs>
                                <text className="fill-ink" style={{ fontSize: 8.6, fontWeight: 800, fontVariationSettings: "'wdth' 75", letterSpacing: 0.4 }}>
                                    <textPath href="#vinyl-label-path">{LABEL_TEXT}</textPath>
                                </text>
                            </svg>
                            <span className="absolute left-1/2 top-1/2 h-[9%] w-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
                        </div>
                    </div>
                    <div aria-hidden="true" className="vinyl-sheen pointer-events-none absolute inset-0 rounded-full" />

                    {/* tonearm */}
                    <svg aria-hidden="true" viewBox="0 0 100 100" className="vinyl-arm pointer-events-none absolute -right-[6%] -top-[8%] h-[70%] w-[70%]">
                        <circle cx="88" cy="8" r="6" className="fill-[hsl(var(--line))]" />
                        <circle cx="88" cy="8" r="2.4" className="fill-foreground/70" />
                        <path d="M88 8 L80 60 L58 84" fill="none" strokeWidth="2.6" strokeLinecap="round" className="stroke-foreground/80" />
                        <rect x="50" y="80" width="12" height="7" rx="1" transform="rotate(-48 56 84)" className="fill-foreground" />
                    </svg>
                </div>
            </div>

            <div>
                <h1 className="type-poster text-[clamp(3.75rem,13vw,9.5rem)] leading-[0.85] text-foreground">
                    Puść swoją historię
                </h1>
                <Pitch className="mt-6" />
                <div className="mt-8">
                    {error}
                    <LoginButton onLogin={onLogin} />
                </div>
            </div>
        </div>

        <div className="relative z-10">
            <Fineprint />
        </div>
    </main>
);

/* ------------------------------------------------------------------ */
/* 3. Poster wall — rows of what the app shows, flyposted and moving   */
/* ------------------------------------------------------------------ */
const ROWS: { items: string[]; tone: "paper" | "accent" | "outline"; d: number; reverse?: boolean }[] = [
    { items: ["Top artyści", "Top utwory", "Gatunki"], tone: "paper", d: 38 },
    { items: ["2 417 minut", "318 odtworzeń", "41 dni z muzyką"], tone: "accent", d: 46, reverse: true },
    { items: ["Historia", "Podsumowanie", "Złote godziny"], tone: "outline", d: 34 },
    { items: ["Piątek, 22:00", "Twoja godzina", "Seria 12 dni"], tone: "paper", d: 52, reverse: true },
];

const toneClass = { paper: "text-foreground", accent: "text-primary", outline: "wall-outline" } as const;

export const WallLogin = ({ error, onLogin }: LoginVariantProps) => (
    <main className="wall-stage flex min-h-[100svh] flex-col bg-background">
        <div aria-hidden="true" className="flex flex-1 flex-col justify-center gap-[1.2vw] overflow-hidden py-6">
            {ROWS.map((row, r) => {
                const run = [...row.items, ...row.items];
                return (
                    <div key={r} className="wall-track" style={{ "--d": `${row.d}s`, "--dir": row.reverse ? "reverse" : "normal" } as CSSProperties}>
                        {[0, 1].map(half => (
                            <div key={half} className="flex shrink-0 items-center">
                                {run.map((t, i) => (
                                    <span key={i} className="flex items-center">
                                        <span className={`type-poster whitespace-nowrap px-[2.2vw] text-[clamp(4.25rem,11.5vw,9.5rem)] leading-[0.9] ${toneClass[row.tone]}`}>
                                            {t}
                                        </span>
                                        <span className={`h-[1.6vw] min-h-2 w-[1.6vw] min-w-2 shrink-0 ${r % 2 ? "bg-foreground/30" : "bg-primary"}`} />
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>

        <section className="rule border-t border-border px-5 py-8 sm:px-10 lg:px-16">
            <div className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end">
                <h1 className="type-poster text-[clamp(3rem,9vw,5.5rem)] leading-[0.85] text-primary">SpotiStats</h1>
                <Pitch className="md:pb-1" />
                <div>
                    {error}
                    <LoginButton onLogin={onLogin} />
                </div>
            </div>
            <div className="mt-8">
                <Fineprint />
            </div>
        </section>
    </main>
);
