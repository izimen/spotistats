import type { CSSProperties } from "react";
import { calculateTopGenres, type Artist } from "@/lib/genreUtils";
import { EmptyNote } from "@/components/Editorial";

/** Top 5 genres as typographic bars (genre name over a hairline that fills to its share). */
const GenreList = ({ artists }: { artists?: Artist[] }) => {
    const { topGenres } = calculateTopGenres(artists || [], 5);

    if (!artists?.length || topGenres.length === 0) {
        return <EmptyNote title="Brak gatunków">Spotify nie przypisał gatunków Twoim artystom w tym okresie.</EmptyNote>;
    }

    const max = topGenres[0].percentage || 100;
    return (
        <ol className="space-y-5">
            {topGenres.map((g, i) => (
                <li key={g.name} className="row-in" style={{ "--i": i } as CSSProperties}>
                    <div className="flex items-baseline justify-between gap-4">
                        <span className={`type-head truncate text-[22px] capitalize ${i === 0 ? "text-primary" : "text-foreground"}`}>{g.name}</span>
                        <span className="tabular-nums text-sm text-muted-foreground">{g.percentage}%</span>
                    </div>
                    <div
                        className="mt-2 h-[3px] bg-border"
                        role="meter"
                        aria-label={g.name}
                        aria-valuenow={g.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div className={`h-full ${i === 0 ? "bg-primary" : "bg-foreground/60"}`} style={{ width: `${(g.percentage / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ol>
    );
};

export default GenreList;
