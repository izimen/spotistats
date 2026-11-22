import { type CSSProperties, Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import "./vinyl.css";
import Logo from "@/components/Logo";

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

export const LoginButton = ({ onLogin, label }: { onLogin: () => void; label?: string }) => (
    <button
        type="button"
        onClick={onLogin}
        className="login-cta touch-target inline-flex items-center gap-3 rounded-full bg-spotify px-7 py-3 text-base font-bold text-ink transition-[filter,transform] hover:brightness-110 active:scale-[.98]"
    >
        <SpotifyMark />
        {label ?? "Zaloguj się przez Spotify"}
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
/* Vinyl — a loop: the record slides out of the poster sleeve, the  */
/*    needle drops and notes rise for 20 s, then it rests inside 3 s   */
/* ------------------------------------------------------------------ */
const LABEL_TEXT = "SpotiStats  ✦  Twoja muzyka w liczbach  ✦  ";
const HEADLINES = ["Puść swoją historię", "Odtwórz swój rok", "Zagraj swoje liczby"];

/** in → out (slide) → playing (needle down, notes) → stopping (needle up) → in */
type Phase = "in" | "out" | "playing" | "stopping";
const PHASE_MS: Record<Phase, number> = { in: 3000, out: 1100, playing: 20000, stopping: 900 };
const NEXT: Record<Phase, Phase> = { in: "out", out: "playing", playing: "stopping", stopping: "in" };

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NOTES = Array.from({ length: 9 }, (_, i) => ({
    kind: i % 3,
    left: 52 + rnd(i, 11) * 34, // % of the box, over the record
    top: 22 + rnd(i, 13) * 40,
    dx: Math.round((rnd(i, 17) - 0.3) * 120),
    rot: Math.round((rnd(i, 19) - 0.5) * 50),
    size: 7 + rnd(i, 23) * 5, // % of box height
    delay: (i * 0.47).toFixed(2),
    accent: i % 2 === 0,
}));

const Note = ({ kind }: { kind: number }) => (
    <svg viewBox="0 0 24 24" className="h-full w-full fill-current" aria-hidden="true">
        {kind === 0 && <path d="M15 3v11.6A3.5 3.5 0 1 0 17 18V7h4V3h-6z" />}
        {kind === 1 && <path d="M8 4v10.6A3.5 3.5 0 1 0 10 18V8.2l9-2V12.6A3.5 3.5 0 1 0 21 16V2L8 4z" />}
        {kind === 2 && <path d="M12 3v11.6A3.5 3.5 0 1 0 14 18V7.5c2.5.4 4 1.9 4.5 4 1.5-3.6-1-7.3-6.5-8.5z" />}
    </svg>
);

/** Words drop in from above; the old line falls away underneath. */
const DroppingHeadline = () => {
    const [index, setIndex] = useState(0);
    const [prev, setPrev] = useState<number | null>(null);
    const last = useRef(0);

    useEffect(() => {
        if (prefersReducedMotion()) return;
        const id = window.setInterval(() => setIndex(i => (i + 1) % HEADLINES.length), 10000);
        return () => window.clearInterval(id);
    }, []);

    // keep the outgoing line on screen just long enough to fall away
    useEffect(() => {
        if (index === last.current) return;
        setPrev(last.current);
        last.current = index;
        const id = window.setTimeout(() => setPrev(null), 900);
        return () => window.clearTimeout(id);
    }, [index]);

    const line = (text: string, mode: "in" | "out", key: string) => (
        <span key={key} aria-hidden={mode === "out" || undefined} className="[grid-area:1/1]">
            {text.split(" ").map((word, w) => (
                <Fragment key={w}>
                    {w > 0 && " "}
                    <span className={`inline-block ${mode === "in" ? "headline-drop-in" : "headline-drop-out"}`} style={{ animationDelay: `${w * 110}ms` }}>
                        {word}
                    </span>
                </Fragment>
            ))}
        </span>
    );

    return (
        <h1 className="type-poster grid text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.85] text-foreground">
            {prev !== null && line(HEADLINES[prev], "out", `out-${prev}`)}
            {line(HEADLINES[index], "in", `in-${index}`)}
        </h1>
    );
};

const VinylLogin = ({ error, onLogin }: LoginVariantProps) => {
    const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? "playing" : "in"));
    const [clicked, setClicked] = useState(false);
    const started = useRef(false);

    useEffect(() => {
        if (prefersReducedMotion() || clicked) return;
        // the very first "in" is short: the page should start moving almost at once
        const ms = phase === "in" && !started.current ? 350 : PHASE_MS[phase];
        const id = window.setTimeout(() => {
            started.current = true;
            setPhase(NEXT[phase]);
        }, ms);
        return () => window.clearTimeout(id);
    }, [phase, clicked]);

    const play = () => {
        if (clicked) return;
        setClicked(true);
        setPhase(p => (p === "in" ? "out" : "playing"));
        window.setTimeout(onLogin, prefersReducedMotion() ? 0 : 900);
    };

    return (
        <main data-phase={phase} data-playing={clicked} className="vinyl-stage relative flex min-h-[100svh] flex-col overflow-hidden bg-background px-5 py-8 sm:px-10 lg:px-16">
            <p className="relative z-10 flex items-center gap-3 text-sm text-muted-foreground">
                <Logo className="h-8 w-11" />
                <span>
                    <span className="block font-bold text-foreground">SpotiStats</span>
                    Statystyki słuchania ze Spotify
                </span>
            </p>

            <div className="relative grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                {/* sleeve + record + arm share one 155:100 box so the SVG arm lines up with the disc */}
                <div className="relative order-first w-[min(100%,640px)] lg:order-last lg:justify-self-end">
                    <div className="relative aspect-[155/100]">
                        {/* record (behind the sleeve while it rests) */}
                        <div className="vinyl-slide absolute left-0 top-[3%] z-0 aspect-square h-[94%]">
                            <div className="vinyl-disc vinyl-spin absolute inset-0 rounded-full">
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
                        </div>

                        {/* sleeve: the app's own gig poster */}
                        <div aria-hidden="true" className="absolute left-0 top-0 z-10 flex aspect-square h-full flex-col justify-between overflow-hidden bg-primary p-[6%] text-ink">
                            <span className="pointer-events-none absolute inset-[5%] rounded-full border-[3px] border-ink/[.07]" />
                            <p className="relative text-[clamp(.7rem,1.6vw,.95rem)] font-bold wdth-75">Strona A</p>
                            <p className="type-poster relative text-[clamp(3rem,9.5vw,7.5rem)] leading-[0.8]">
                                Spoti<br />Stats
                            </p>
                            <p className="relative max-w-[16ch] text-[clamp(.75rem,1.7vw,1rem)] font-semibold leading-tight text-ink/75">
                                Twoja muzyka w liczbach
                            </p>
                        </div>

                        {/* notes rise while the record plays */}
                        <div aria-hidden="true" className="vinyl-notes pointer-events-none absolute inset-0 z-30">
                            {NOTES.map((n, i) => (
                                <span
                                    key={i}
                                    className={`vinyl-note absolute ${n.accent ? "text-primary" : "text-foreground"}`}
                                    style={{
                                        left: `${n.left}%`,
                                        top: `${n.top}%`,
                                        height: `${n.size}%`,
                                        aspectRatio: "1",
                                        animationDelay: `${n.delay}s`,
                                        "--dx": `${n.dx}%`,
                                        "--rot": `${n.rot}deg`,
                                    } as CSSProperties}
                                >
                                    <Note kind={n.kind} />
                                </span>
                            ))}
                        </div>

                        {/* tonearm, drawn in the box's own coordinates (record centre ends at 105,50) */}
                        <svg aria-hidden="true" viewBox="0 0 155 100" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
                            <circle cx="146" cy="14" r="7.5" className="fill-[hsl(var(--line))]" />
                            <g className="vinyl-arm">
                                <rect x="142.5" y="0" width="7" height="8" rx="1.2" className="fill-foreground/60" />
                                <path d="M146 14 L145 56 L129 73" fill="none" strokeWidth="2.2" strokeLinecap="round" className="stroke-foreground/85" />
                                <g transform="rotate(42 127 76)">
                                    <rect x="122" y="72" width="11" height="7" rx="1" className="fill-foreground" />
                                    <rect x="124.5" y="78.5" width="2" height="2.5" className="fill-primary" />
                                </g>
                            </g>
                            <circle cx="146" cy="14" r="3" className="fill-foreground/80" />
                        </svg>
                    </div>
                </div>

                <div className="relative z-10">
                    <DroppingHeadline />
                    <Pitch className="mt-6" />
                    <div className="mt-8">
                        {error}
                        <LoginButton onLogin={play} label={clicked ? "Puszczam…" : undefined} />
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <Fineprint />
            </div>
        </main>
    );
};

export default VinylLogin;
