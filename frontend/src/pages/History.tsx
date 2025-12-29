import { Calendar, Dna, Shuffle, Target, Flame, Star, Moon, Zap, Repeat, Play, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";
import { useUser, useListeningHistory } from "@/hooks/useSpotifyData";
import { useHistoryStats } from "@/hooks/useHistoryStats";
import HistoryList from "@/components/HistoryList";
import StatisticsGrid from "@/components/StatisticsGrid";
import { AxiosError } from "axios";

interface HistoryItem {
  trackId?: string;
  id?: string;
  playedAt?: string;
  trackName?: string;
  artistName?: string;
  albumImage?: string;  // Album cover URL from StreamingHistory
  msPlayed?: number;
  track?: {
    id?: string;
    name?: string;
    artists?: { name: string }[];
    album?: { image?: string; images?: { url: string }[] };
    duration_ms?: number;
    duration?: number;
  };
}

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
}

interface Badge {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  unlocked: boolean;
  color: string;
}

const History = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [showRouletteModal, setShowRouletteModal] = useState(false);
  const [rouletteTrack, setRouletteTrack] = useState<HistoryTrack | null>(null);

  // Calculate date range based on timeRange
  const dateRange = useMemo(() => {
    const now = new Date();
    const from = new Date();

    switch (timeRange) {
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setDate(now.getDate() - 30);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return { from: undefined, to: undefined };
    }

    return { from, to: now };
  }, [timeRange]);

  // API hooks
  const { error: userError } = useUser();
  const { data: historyData, isLoading } = useListeningHistory({
    from: dateRange.from,
    to: dateRange.to,
    limit: 100,
  });

  const recentTracks = historyData?.plays || [];

  // Redirect on 401
  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);

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

  // Format duration from ms to mm:ss
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format tracks for display
  const formattedTracks: HistoryTrack[] = useMemo(() =>
    (recentTracks || []).map((item: HistoryItem, index: number) => {
      // StreamingHistory uses: trackName, artistName, msPlayed, playedAt, albumImage
      // RecentlyPlayed uses: track.name, track.artists, track.duration_ms, track.album.images
      const isStreamingHistory = 'trackName' in item;

      const durationMs = isStreamingHistory
        ? (item.msPlayed || 180000)
        : (item.track?.duration_ms || item.track?.duration || 180000);

      // Get image: for StreamingHistory use albumImage directly, for API use nested structure
      const imageUrl = isStreamingHistory
        ? item.albumImage
        : (item.track?.album?.image || item.track?.album?.images?.[0]?.url || null);

      return {
        id: `${item.trackId || item.id || index}-${item.playedAt}`,
        trackId: item.trackId || item.track?.id || index.toString(),
        title: isStreamingHistory ? item.trackName : (item.track?.name || 'Unknown'),
        artist: isStreamingHistory ? item.artistName : (item.track?.artists?.[0]?.name || 'Unknown'),
        image: imageUrl || "/assets/default-album.svg",
        playedAt: formatTimeAgo(item.playedAt || new Date().toISOString()),
        playedAtDate: new Date(item.playedAt || new Date().toISOString()),
        duration: typeof durationMs === 'number' ? formatDuration(durationMs) : '3:00',
        durationMs: typeof durationMs === 'number' ? durationMs : 180000
      };
    })
    , [recentTracks]);

  // Use custom hook for stats logic
  const {
    totalMinutes,
    minutesDiff,
    minutesDiffPercent,
    mostLooped,
    listeningMode,
    prediction,
    musicDNA,
    heatmapData
  } = useHistoryStats(formattedTracks);

  // 🎲 Discovery Roulette - find skipped tracks worth retrying
  const getRouletteTrack = () => {
    // Simulate finding a track that was played only once (potential skip)
    const trackCounts: { [key: string]: { count: number; track: HistoryTrack } } = {};
    formattedTracks.forEach(track => {
      const key = `${track.title}-${track.artist}`;
      if (!trackCounts[key]) {
        trackCounts[key] = { count: 0, track };
      }
      trackCounts[key].count++;
    });

    const singlePlays = Object.values(trackCounts).filter(t => t.count === 1);
    if (singlePlays.length > 0) {
      const random = singlePlays[Math.floor(Math.random() * singlePlays.length)];
      return random.track;
    }
    return formattedTracks[Math.floor(Math.random() * formattedTracks.length)];
  };

  const spinRoulette = () => {
    setRouletteTrack(getRouletteTrack());
    setShowRouletteModal(true);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="mb-12 opacity-0 animate-fade-in">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
                <span className="text-primary">Historia</span> słuchania
              </h1>
              <p className="text-lg text-muted-foreground">
                Wszystkie Twoje ostatnio słuchane utwory
              </p>
            </div>
          </div>
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </section>

      {/* Stats Grid */}
      <StatisticsGrid
        totalMinutes={totalMinutes}
        minutesDiff={minutesDiff}
        minutesDiffPercent={minutesDiffPercent}
        mostLooped={mostLooped}
        listeningMode={listeningMode}
      />

      {/* 🔮 Prediction + 🎲 Roulette Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Prediction */}
        {prediction && (
          <div className="opacity-0 animate-fade-in rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-card p-6" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-xl">🔮</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Przewidywanie</h3>
                <p className="text-xs text-muted-foreground">Na podstawie wzorców</p>
              </div>
            </div>
            <p className="text-foreground mb-2">
              Dziś {prediction.time} najpewniej posłuchasz <span className="text-purple-400 font-semibold">{prediction.artist}</span>
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-purple-500/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${prediction.confidence}%` }}
                />
              </div>
              <span className="text-xs text-purple-400">{prediction.confidence}%</span>
            </div>
          </div>
        )}

        {/* Discovery Roulette */}
        <div className="opacity-0 animate-fade-in rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-card to-card p-6" style={{ animationDelay: '450ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-xl">🎲</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Muzyczna Ruletka</h3>
              <p className="text-xs text-muted-foreground">Daj szansę czemuś nowemu</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Odkryj utwór, który mógł Ci umknąć
          </p>
          <button
            onClick={spinRoulette}
            className="w-full py-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Shuffle className="w-4 h-4" />
            Zakręć ruletką
          </button>
        </div>
      </section>



      {/* 🧬 Music DNA */}
      <section className="mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '550ms' }}>
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-card to-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Dna className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Twoje Muzyczne DNA</h3>
              <p className="text-xs text-muted-foreground">Profil soniczny</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: "Energia", value: musicDNA.energy, color: "bg-red-500" },
              { label: "Taneczność", value: musicDNA.danceability, color: "bg-pink-500" },
              { label: "Akustyka", value: musicDNA.acoustic, color: "bg-green-500" },
              { label: "Nostalgia", value: musicDNA.nostalgia, color: "bg-purple-500" },
              { label: "Głośność", value: musicDNA.loudness, color: "bg-orange-500" },
            ].map(attr => (
              <div key={attr.label} className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24">{attr.label}</span>
                <div className="flex-1 h-3 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${attr.color} rounded-full transition-all duration-1000`}
                    style={{ width: `${attr.value}%` }}
                  />
                </div>
                <span className="text-sm text-foreground w-12 text-right">{attr.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Heatmap - Godziny aktywności */}
      <section className="mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '600ms' }}>
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Godziny aktywności
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <span>Mało</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary/60" />
                <span>Średnio</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span>Dużo</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 items-end h-24">
            {heatmapData.map(({ hour, count, intensity }) => (
              <div key={hour} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full">
                  <div
                    className="w-full rounded transition-all hover:scale-105 cursor-pointer"
                    style={{
                      height: `${Math.max(8, intensity * 80)}px`,
                      backgroundColor: intensity > 0.7
                        ? 'hsl(var(--primary))'
                        : intensity > 0.3
                          ? 'hsl(var(--primary) / 0.6)'
                          : 'hsl(var(--primary) / 0.2)'
                    }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {count} utworów
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{hour}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History List */}
      <HistoryList tracks={formattedTracks} isLoading={isLoading} />

      {/* 🎲 Roulette Modal */}
      {showRouletteModal && rouletteTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-orange-500/30 bg-card p-6 shadow-2xl animate-fade-in">
            <button
              onClick={() => setShowRouletteModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-4xl mb-4 block">🎲</span>
              <h3 className="text-xl font-bold text-foreground mb-2">Daj szansę!</h3>
              <p className="text-sm text-muted-foreground mb-6">Ten utwór może Ci się spodobać</p>

              <div className="flex items-center gap-4 bg-secondary/30 rounded-xl p-4 mb-6">
                <img
                  src={rouletteTrack.image}
                  alt={rouletteTrack.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="text-left flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{rouletteTrack.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{rouletteTrack.artist}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={spinRoulette}
                  className="py-3 rounded-xl bg-secondary/50 text-foreground hover:bg-secondary transition-all text-sm font-medium"
                >
                  Zakręć znowu
                </button>
                <button className="py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  Odtwórz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default History;
