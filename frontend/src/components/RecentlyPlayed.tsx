import { Clock, Play, MoreHorizontal, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useRecentlyPlayed } from "@/hooks/useSpotifyData";

interface Track {
  id: string;
  title: string;
  artist: string;
  image: string;
  playedAt: string;
  spotifyUrl?: string | null;
}

// Single track row component with premium styling
const TrackRow = ({ track, index, hoveredId, setHoveredId }: {
  track: Track;
  index: number;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) => {
  const isHovered = hoveredId === track.id;

  const handleTrackClick = () => {
    if (track.spotifyUrl) {
      window.open(track.spotifyUrl, '_blank');
    } else {
      // Fallback: open Spotify search for track + artist
      const query = encodeURIComponent(`${track.title} ${track.artist}`);
      window.open(`https://open.spotify.com/search/${query}`, '_blank');
    }
  };

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent track click
    // Open Spotify search for artist
    const query = encodeURIComponent(track.artist);
    window.open(`https://open.spotify.com/search/${query}`, '_blank');
  };

  return (
    <div
      key={track.id}
      className={`
        group relative flex items-center gap-3 p-2.5 rounded-xl
        bg-transparent hover:bg-muted/40
        border border-transparent hover:border-border/30
        transition-all duration-200 cursor-pointer
        opacity-0 animate-slide-up
      `}
      style={{ animationDelay: `${700 + index * 60}ms` }}
      onMouseEnter={() => setHoveredId(track.id)}
      onMouseLeave={() => setHoveredId(null)}
      onClick={handleTrackClick}
    >
      {/* Album art */}
      <div className="relative flex-shrink-0">
        <div className={`
          w-12 h-12 rounded-lg overflow-hidden
          ring-1 ring-border/30 group-hover:ring-primary/40
          shadow-sm group-hover:shadow-md
          transition-all duration-300
        `}>
          <img
            src={track.image}
            alt={track.title}
            className={`
              w-full h-full object-cover
              transition-transform duration-500
              ${isHovered ? 'scale-110' : 'scale-100'}
            `}
          />
        </div>

        {/* Play overlay */}
        <div className={`
          absolute inset-0 flex items-center justify-center
          bg-black/60 backdrop-blur-sm rounded-lg
          transition-all duration-200
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
            <Play className="w-3.5 h-3.5 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {track.title}
        </h3>
        <p
          className="text-xs text-muted-foreground truncate hover:text-primary hover:underline cursor-pointer transition-colors"
          onClick={handleArtistClick}
        >
          {track.artist}
        </p>
      </div>

      {/* Time badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`
          text-xs px-2 py-1 rounded-md
          ${track.playedAt === 'Teraz'
            ? 'bg-primary/10 text-primary font-medium'
            : 'bg-muted/50 text-muted-foreground'
          }
          group-hover:bg-primary/10 group-hover:text-primary
          transition-all
        `}>
          {track.playedAt}
        </span>
      </div>
    </div>
  );
};

const RecentlyPlayed = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { data: recentTracks, isLoading } = useRecentlyPlayed(10);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours}h temu`;
    return `${Math.floor(diffHours / 24)}d temu`;
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
      spotifyUrl?: string | null;
    };
  }

  const formattedTracks: Track[] = (recentTracks || []).slice(0, 10).map((item: RecentTrackItem, index: number) => ({
    id: `${item.track?.id || index}-${index}`,
    title: item.track?.name || item.name || 'Unknown',
    artist: item.track?.artists?.[0]?.name || item.artist || 'Unknown',
    image: item.track?.album?.image || item.track?.album?.images?.[0]?.url || item.albumImage || "/assets/default-album.svg",
    playedAt: formatTimeAgo(item.playedAt || new Date().toISOString()),
    spotifyUrl: item.track?.spotifyUrl || null
  }));


  const halfLength = Math.ceil(formattedTracks.length / 2);
  const leftColumn = formattedTracks.slice(0, halfLength);
  const rightColumn = formattedTracks.slice(halfLength);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-card opacity-0 animate-fade-in"
      style={{ animationDelay: "600ms" }}
    >
      {/* Subtle background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-transparent" />

      {/* Header */}
      <div className="relative p-5 pb-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-container-sm">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Ostatnio słuchane</h2>
              <p className="text-sm text-muted-foreground">Twoja historia utworów</p>
            </div>
          </div>
          <a
            href="/history"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all duration-200"
          >
            <span>Historia</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Track list */}
      <div className="relative p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : formattedTracks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            {/* Left column */}
            <div className="space-y-1">
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
            <div className="space-y-1">
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
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">Brak ostatnio słuchanych utworów</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentlyPlayed;
