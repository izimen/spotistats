import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";

/**
 * The gig poster: a duotone of the #1 artist (ink shadows, accent highlights) with their
 * name set across the full width in ultra-condensed type, biting into the photo's lower edge.
 * The one loud element of the app.
 */
const Poster = ({
    kicker,
    name,
    image,
    dateLine,
    href,
}: {
    kicker: ReactNode;
    name: string;
    image?: string | null;
    dateLine?: ReactNode;
    href?: string | null;
}) => {
    const boxRef = useRef<HTMLElement>(null);
    const nameRef = useRef<HTMLSpanElement>(null);
    const [size, setSize] = useState<number | null>(null);
    const [stacked, setStacked] = useState(false);
    const words = name.trim().split(/\s+/);

    // Fit the name to the sheet width, like a real poster headline
    useLayoutEffect(() => {
        const fit = () => {
            const box = boxRef.current, text = nameRef.current;
            if (!box || !text) return;
            // measuring with a fallback font gives a wrong size - wait for Archivo
            if (document.fonts && !document.fonts.check('900 100px "Archivo"')) return;
            // phones: one word per line (up to 3 words) so the name can be set much larger
            const stack = box.clientWidth < 560 && words.length > 1 && words.length <= 3;
            text.dataset.stacked = String(stack);
            setStacked(stack);
            // measure, scale, re-measure (glyph overhang and hinting make one pass inexact)
            let px = 100;
            for (let i = 0; i < 4; i++) {
                text.style.fontSize = `${px}px`;
                const width = text.getBoundingClientRect().width;
                if (!width) break;
                px = px * (box.clientWidth / width) * 0.97;
            }
            text.style.fontSize = "";
            setSize(Math.max(40, Math.min(300, box.clientWidth * (stack ? 0.55 : 0.7), Math.floor(px))));
        };
        fit();
        const ro = new ResizeObserver(fit);
        if (boxRef.current) ro.observe(boxRef.current);
        document.fonts?.ready.then(fit);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- words derive from name
    }, [name]);

    return (
        <section ref={boxRef} aria-label="Twój numer jeden" className="relative">
            <div className="grid items-end gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                {/* sits 8px above the visible top of the name, which overlaps the photo by ~0.34em */}
                <div className="md:pb-[var(--kicker-pb)]" style={{ "--kicker-pb": size ? `${Math.round(size * 0.34 + 10)}px` : "8rem" } as CSSProperties}>
                    <p className="text-base text-muted-foreground">{kicker}</p>
                    {href && (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-block text-base font-semibold text-foreground underline decoration-spotify decoration-2 underline-offset-4"
                        >
                            Otwórz w Spotify
                        </a>
                    )}
                </div>
                <div className="duotone aspect-[4/3] w-full md:aspect-[5/4]">
                    {image && <img src={image} alt="" />}
                    {/* keeps the name legible where it crosses the photo */}
                    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-[45%] bg-gradient-to-b from-transparent to-ink/85" />
                </div>
            </div>
            <h1
                className="type-poster relative z-10 text-foreground"
                style={{
                    fontSize: size ? `${size}px` : "clamp(3rem,14vw,10rem)",
                    visibility: size ? "visible" : "hidden",
                    marginTop: "-0.42em",
                }}
            >
                <span ref={nameRef} className="inline-block whitespace-nowrap [overflow-wrap:normal] [hyphens:none] poster-name">
                    {words.map((w, i) => (
                        <span key={i}>{w}{i < words.length - 1 && !stacked ? " " : ""}</span>
                    ))}
                </span>
            </h1>
            {dateLine && <p className="mt-4 type-head text-[22px] sm:text-[28px] text-primary">{dateLine}</p>}
        </section>
    );
};

export default Poster;
