import { Clock, Play, MoreHorizontal, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRecentlyPlayed } from "@/hooks/useSpotifyData";

interface Track {
  id: string;
  title: string;
  artist: string;
  image: string;
  playedAt: string;
}

// Single track row component
const TrackRow = ({ track, index, hoveredId, setHoveredId }: {
  track: Track;
  index: number;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) => {
  return (
    <div
      key={track.id}
      className={`
        group relative flex items-center gap-4 p-3 rounded-xl
        bg-gradient-to-r from-transparent to-transparent
        hover:from-secondary/50 hover:to-primary/5
        border border-transparent hover:border-border/50
        transition-all duration-300 cursor-pointer
        opacity-0 animate-slide-up
      `}
      style={{ animationDelay: `${700 + index * 80}ms` }}
      onMouseEnter={() => setHoveredId(track.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      {/* Album art */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-border group-hover:ring-primary/50 transition-all duration-300 shadow-lg">
          <img
            src={track.image}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>

        {/* Play overlay */}
        <div className={`
          absolute inset-0 flex items-center justify-center
          bg-background/70 backdrop-blur-sm rounded-xl
          transition-all duration-300
          ${hoveredId === track.id ? 'opacity-100' : 'opacity-0'}
        `}>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-primary/30 blur-xl -z-10 opacity-0 group-hover:opacity-60 transition-opacity" />
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-300">
          {track.title}
        </h3>
        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Time and menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary/50 group-hover:bg-primary/10 group-hover:text-primary transition-all">
          {track.playedAt}
        </span>
        <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-secondary transition-all">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom line animation */}
      <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const RecentlyPlayed = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { data: recentTracks, isLoading } = useRecentlyPlayed(10);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    return `${Math.floor(diffHours / 24)} dni temu`;
  };

  interface RecentTrackItem {
    playedAt?: string;
    name?: string;
    artist?: string;
    albumImage?: string;
    track?: {
      id?: string;
      name?: string;
      artists?: { name: string }[];
      album?: { image?: string; images?: { url: string }[] };
    };
  }

  // Log raw data in development only
  if (import.meta.env.DEV && recentTracks?.length > 0) {
    console.log('[RecentlyPlayed] Raw data sample:', JSON.stringify(recentTracks.slice(0, 2).map((item: RecentTrackItem) => ({
      name: item.track?.name,
      albumImage: item.track?.album?.image,
      albumImages: item.track?.album?.images,
      itemAlbumImage: item.albumImage
    })), null, 2));
  }

  // Format tracks for display - limit to exactly 10
  const formattedTracks: Track[] = (recentTracks || []).slice(0, 10).map((item: RecentTrackItem, index: number) => ({
    id: `${item.track?.id || index}-${index}`,
    title: item.track?.name || item.name || 'Unknown',
    artist: item.track?.artists?.[0]?.name || item.artist || 'Unknown',
    image: item.track?.album?.image || item.track?.album?.images?.[0]?.url || item.albumImage || "/assets/default-album.svg",
    playedAt: formatTimeAgo(item.playedAt || new Date().toISOString())
  }));

  // Split into two equal columns
  const halfLength = Math.ceil(formattedTracks.length / 2);
  const leftColumn = formattedTracks.slice(0, halfLength);
  const rightColumn = formattedTracks.slice(halfLength);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 opacity-0 animate-fade-in"
      style={{ animationDelay: "600ms" }}
    >
      {/* Background glow effects */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative p-6 pb-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Ostatnio słuchane</h2>
              <p className="text-sm text-muted-foreground">Historia Twoich utworów</p>
            </div>
          </div>
          <a
            href="/history"
            className="px-4 py-2 rounded-full text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_hsl(141_73%_42%/0.2)]"
          >
            Zobacz wszystko
          </a>
        </div>
      </div>

      {/* Track list */}
      <div className="relative p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : formattedTracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left column */}
            <div className="space-y-3">
              {leftColumn.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  hoveredId={hoveredId}
                  setHoveredId={setHoveredId}
                />
              ))}
            </div>

            {/* Right column */}
            <div className="space-y-3">
              {rightColumn.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index + halfLength}
                  hoveredId={hoveredId}
                  setHoveredId={setHoveredId}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Brak ostatnio słuchanych utworów</p>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
};

export default RecentlyPlayed;
