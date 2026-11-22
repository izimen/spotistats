import type { CSSProperties } from "react";
import { useRecentlyPlayed } from "@/hooks/useSpotifyData";
import { Section, EmptyNote, ListSkeleton } from "@/components/Editorial";
import { timeAgo } from "@/lib/format";

interface RecentTrackItem {
  playedAt?: string;
  name?: string;
  artist?: string;
  albumImage?: string;
  artists?: { name: string }[];
  album?: { image?: string | null };
  track?: {
    id?: string;
    name?: string;
    artists?: { name: string }[];
    album?: { image?: string; images?: { url: string }[] };
    spotifyUrl?: string | null;
  };
}

/** Last 10 plays as a compact timeline: time on the left, track on the right. */
const RecentlyPlayed = () => {
  const { data, isLoading } = useRecentlyPlayed(10);
  const items = ((data || []) as RecentTrackItem[]).slice(0, 10);

  return (
    <Section title="Ostatnio słuchane" action={{ to: "/history", label: "Pełna historia" }}>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyNote title="Cisza">Nie ma jeszcze ostatnio słuchanych utworów.</EmptyNote>
      ) : (
        <ol className="grid gap-x-10 md:grid-cols-2">
          {items.map((item, i) => {
            const title = item.track?.name || item.name || "Nieznany utwór";
            const artist = item.track?.artists?.[0]?.name || item.artists?.[0]?.name || item.artist || "";
            const image = item.track?.album?.image || item.track?.album?.images?.[0]?.url || item.album?.image || item.albumImage;
            const url = item.track?.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;
            return (
              <li key={`${item.track?.id || title}-${i}`} className="row-in border-b border-border" style={{ "--i": i } as CSSProperties}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 py-3 hover:bg-card/60" title="Otwórz w Spotify">
                  <time dateTime={item.playedAt} className="w-[11ch] shrink-0 text-sm text-muted-foreground">{timeAgo(item.playedAt)}</time>
                  <img src={image || "/assets/default-album.svg"} alt="" loading="lazy" width={40} height={40} className="h-10 w-10 shrink-0 rounded-sm object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">{title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{artist}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
};

export default RecentlyPlayed;
