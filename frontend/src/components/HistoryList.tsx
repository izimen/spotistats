import type { CSSProperties } from "react";
import { EmptyNote, ListSkeleton } from "@/components/Editorial";

interface HistoryTrack {
    id: string;
    trackId: string;
    title: string;
    artist: string;
    image: string;
    playedAt: string;
    playedAtDate: Date;
    duration: string;
    durationMs: number;
    spotifyUrl?: string | null;
}

interface HistoryListProps {
    tracks: HistoryTrack[];
    isLoading: boolean;
}

const dayKey = (d: Date) => d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });

/** Plays grouped by day, like a diary: date as a heading, then time + track rows. */
const HistoryList = ({ tracks, isLoading }: HistoryListProps) => {
    if (isLoading) return <ListSkeleton rows={6} />;
    if (tracks.length === 0) {
        return <EmptyNote title="Brak odtworzeń w tym okresie">Słuchaj muzyki na Spotify — zapisujemy ją co godzinę.</EmptyNote>;
    }

    const groups: { day: string; items: HistoryTrack[] }[] = [];
    for (const t of tracks) {
        const day = dayKey(t.playedAtDate);
        const last = groups[groups.length - 1];
        if (last?.day === day) last.items.push(t);
        else groups.push({ day, items: [t] });
    }

    let row = 0;
    return (
        <div className="space-y-10">
            {groups.map(g => (
                <section key={g.day} aria-label={g.day}>
                    <h3 className="type-head mb-2 text-[20px] first-letter:uppercase text-muted-foreground">{g.day}</h3>
                    <ol>
                        {g.items.map(t => {
                            const url = t.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${t.title} ${t.artist}`)}`;
                            const i = row++;
                            return (
                                <li key={t.id} className="row-in border-b border-border" style={{ "--i": i } as CSSProperties}>
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 py-3 hover:bg-card/60" title="Otwórz w Spotify">
                                        <time dateTime={t.playedAtDate.toISOString()} className="w-[5ch] shrink-0 tabular-nums text-sm text-muted-foreground">
                                            {t.playedAtDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                                        </time>
                                        <img src={t.image} alt="" loading="lazy" width={44} height={44} className="h-11 w-11 shrink-0 rounded-sm object-cover" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold text-foreground">{t.title}</span>
                                            <span className="block truncate text-sm text-muted-foreground">{t.artist}</span>
                                        </span>
                                        <span className="shrink-0 tabular-nums text-sm text-muted-foreground" title="Czas słuchania">{t.duration}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ))}
        </div>
    );
};

export default HistoryList;
