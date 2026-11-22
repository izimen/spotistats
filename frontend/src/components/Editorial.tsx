import { type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

/* Shared page anatomy for the poster design: type and hairline rules instead of cards. */

export const PageHeader = ({ title, meta, controls }: { title: string; meta?: ReactNode; controls?: ReactNode }) => (
    <header className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
            <h1 className="type-poster text-[clamp(3.25rem,11vw,6.5rem)] text-foreground">{title}</h1>
            {meta && <p className="mt-3 max-w-[60ch] text-muted-foreground">{meta}</p>}
        </div>
        {controls && <div className="flex flex-wrap items-end gap-x-8 gap-y-3">{controls}</div>}
    </header>
);

export const Section = ({
    id,
    title,
    note,
    action,
    children,
    className = "",
}: {
    id?: string;
    title: string;
    note?: ReactNode;
    action?: { to: string; label: string };
    children: ReactNode;
    className?: string;
}) => (
    <section id={id} className={`rule min-w-0 pt-6 scroll-mt-24 ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
        <div className="mb-5 flex items-baseline justify-between gap-4">
            <div className="min-w-0">
                <h2 id={id ? `${id}-title` : undefined} className="type-head text-[26px] sm:text-[30px]">{title}</h2>
                {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
            </div>
            {action && (
                <Link to={action.to} className="shrink-0 text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">
                    {action.label}
                </Link>
            )}
        </div>
        {children}
    </section>
);

/** A figure: label on top, big number, optional note. Use inside a <dl>-like grid. */
export const Figure = ({ label, value, note, emphasis = false }: { label: string; value: ReactNode; note?: ReactNode; emphasis?: boolean }) => (
    <div className="min-w-0">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className={`type-figure mt-2 truncate text-[clamp(1.75rem,5vw,2.75rem)] ${emphasis ? "text-primary" : "text-foreground"}`}>{value}</dd>
        {note && <dd className="mt-1.5 text-sm text-muted-foreground">{note}</dd>}
    </div>
);

export const FigureRow = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 ${className}`}>{children}</dl>
);

/** Chart-style row: huge numeral, artwork, title, value. Top 3 numerals take the accent. */
export const ChartRow = ({
    rank,
    image,
    title,
    subtitle,
    value,
    href,
    index = 0,
    round = false,
}: {
    rank: number;
    image?: string | null;
    title: string;
    subtitle?: ReactNode;
    value?: ReactNode;
    href?: string | null;
    index?: number;
    round?: boolean;
}) => {
    const content = (
        <>
            <span
                className={`type-rank w-[2.2ch] shrink-0 text-right text-[40px] sm:text-[48px] ${rank <= 3 ? "text-primary" : "text-muted-foreground/60"}`}
                aria-label={`Miejsce ${rank}`}
            >
                {rank}
            </span>
            {image !== undefined && (
                <img
                    src={image || "/assets/default-album.svg"}
                    alt=""
                    loading="lazy"
                    width={56}
                    height={56}
                    className={`h-12 w-12 shrink-0 object-cover sm:h-14 sm:w-14 ${round ? "rounded-full" : "rounded-sm"}`}
                />
            )}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold text-foreground">{title}</span>
                {subtitle && <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>}
            </span>
            {value !== undefined && <span className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">{value}</span>}
        </>
    );
    const cls = "row-in flex items-center gap-4 border-b border-border py-3";
    const style = { "--i": index } as CSSProperties;
    return (
        <li style={style} className="list-none">
            {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} group hover:bg-card/60`} title="Otwórz w Spotify">
                    {content}
                </a>
            ) : (
                <div className={cls}>{content}</div>
            )}
        </li>
    );
};

export const EmptyNote = ({ title, children }: { title: string; children?: ReactNode }) => (
    <div className="py-10">
        <p className="type-head text-[22px] text-foreground">{title}</p>
        {children && <p className="mt-2 max-w-[52ch] text-muted-foreground">{children}</p>}
    </div>
);

export const Skeleton = ({ className = "" }: { className?: string }) => <div className={`skeleton rounded-sm ${className}`} aria-hidden="true" />;

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <div role="status" aria-label="Ładowanie" className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
        ))}
    </div>
);
