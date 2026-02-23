import { Calendar, Dna, Shuffle, Target, Flame, Star, Moon, Zap, Repeat, Play, X, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";
import { useUser, useListeningHistory } from "@/hooks/useSpotifyData";
import { useHistoryStats } from "@/hooks/useHistoryStats";
import HistoryList from "@/components/HistoryList";
import StatisticsGrid from "@/components/StatisticsGrid";
import { isValidImageUrl } from "@/lib/utils";
import { AxiosError } from "axios";
import api from "@/lib/api";

interface HistoryItem {
  trackId?: string;
  id?: string;
  playedAt?: string;
  trackName?: string;
  artistName?: string;
  albumImage?: string;  // Album cover URL from StreamingHistory
  msPlayed?: number;
  spotifyUrl?: string | null;
  track?: {
    id?: string;
    name?: string;
    artists?: { name: string }[];
    album?: { image?: string; images?: { url: string }[] };
    duration_ms?: number;
    duration?: number;
    spotifyUrl?: string | null;
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
  spotifyUrl?: string | null;
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
        durationMs: typeof durationMs === 'number' ? durationMs : 180000,
        spotifyUrl: isStreamingHistory ? item.spotifyUrl : item.track?.spotifyUrl
      };
    })
    , [recentTracks]);

  // Calculate statistics - use server-side stats if available
  const serverTotalMinutes = historyData?.totalTimeMs
    ? Math.round(historyData.totalTimeMs / 60000)
    : undefined;

  // Use backend stats for mostLooped and topHours
  const serverMostLooped = historyData?.stats?.mostLooped;
  const serverTopHours = historyData?.stats?.topHours;

  const {
    totalMinutes,
    minutesDiff,
    minutesDiffPercent,
    mostLooped: localMostLooped,
    listeningMode,
    musicDNA: localMusicDNA,
    prediction: localPrediction,
    heatmapData: localHeatmapData
  } = useHistoryStats(formattedTracks, serverTotalMinutes);

  // Prefer server stats, fallback to local
  const mostLooped = serverMostLooped
    ? { title: serverMostLooped.trackName, artist: serverMostLooped.artistName, image: serverMostLooped.albumImage, count: serverMostLooped.count }
    : localMostLooped;

  // API-based Music DNA (real Spotify Audio Features)
  const [apiMusicDNA, setApiMusicDNA] = useState<{
    energy: number;
    danceability: number;
    acoustic: number;
    nostalgia: number;
    loudness: number;
  } | null>(null);

  // API-based Prediction (30-day history analysis)
  const [apiPrediction, setApiPrediction] = useState<{
    artist: string;
    time: string;
    confidence: number;
    factors?: {
      totalTracks?: number;
      uniqueDays?: number;
      isWeekend?: boolean;
    };
  } | null>(null);

  // API-based Heatmap (Full History)
  const [apiHeatmap, setApiHeatmap] = useState<{
    hour: number;
    count: number;
    intensity: number;
  }[] | null>(null);

  // Fetch Music DNA from API (Only for 'all' time range)
  useEffect(() => {
    if (timeRange !== 'all') {
      setApiMusicDNA(null);
      return;
    }

    const fetchMusicDNA = async () => {
      try {
        const response = await api.get('/api/v1/stats/dna');
        const data = response.data;
        if (data.success && data.data) {
          setApiMusicDNA(data.data);
        }
      } catch (error) {
        console.error('[History] Failed to fetch Music DNA:', error);
      }
    };
    fetchMusicDNA();
  }, [timeRange]);

  // Fetch Prediction from API (Only for 'all' time range)
  useEffect(() => {
    if (timeRange !== 'all') {
      setApiPrediction(null);
      return;
    }

    const fetchPrediction = async () => {
      try {
        const response = await api.get('/api/v1/stats/prediction');
        const data = response.data;
        if (data.success && data.data) {
          setApiPrediction(data.data);
        }
      } catch (error) {
        console.error('[History] Failed to fetch Prediction:', error);
      }
    };
    fetchPrediction();
  }, [timeRange]);

  // Fetch Heatmap (Peak Hours) from API (Only for 'all' time range)
  useEffect(() => {
    if (timeRange !== 'all') {
      setApiHeatmap(null);
      return;
    }

    const fetchHeatmap = async () => {
      try {
        const response = await api.get('/api/v1/stats/listening-history/heatmap');
        const data = response.data;
        if (data.success && data.data && data.data.length > 0) {
          setApiHeatmap(data.data);
        }
      } catch (error) {
        console.error('[History] Failed to fetch Heatmap:', error);
      }
    };
    fetchHeatmap();
  }, [timeRange]);

  // Use API data if available, fallback to local calculation
  const musicDNA = apiMusicDNA || localMusicDNA;
  const prediction = apiPrediction || localPrediction;
  const heatmapData = apiHeatmap || localHeatmapData;

  // 🎲 Discovery Roulette - get new music recommendation from API
  const [isSpinning, setIsSpinning] = useState(false);

  const spinRoulette = async () => {
    setIsSpinning(true);
    try {
      const response = await api.get('/api/v1/stats/discovery/roulette');
      const data = response.data;

      if (data.success && data.data) {
        setRouletteTrack({
          id: data.data.trackId,
          trackId: data.data.trackId,
          title: data.data.trackName,
          artist: data.data.artistName,
          image: data.data.albumImage || "/assets/default-album.svg",
          playedAt: 'Nowy utwór',
          playedAtDate: new Date(),
          duration: '3:00',
          durationMs: 180000
        });
        setShowRouletteModal(true);
      } else {
        // Fallback to local selection if API fails
        const fallbackTrack = formattedTracks[Math.floor(Math.random() * formattedTracks.length)];
        if (fallbackTrack) {
          setRouletteTrack(fallbackTrack);
          setShowRouletteModal(true);
        }
      }
    } catch (error) {
      console.error('Roulette API error:', error);
      // Fallback to local selection
      const fallbackTrack = formattedTracks[Math.floor(Math.random() * formattedTracks.length)];
      if (fallbackTrack) {
        setRouletteTrack(fallbackTrack);
        setShowRouletteModal(true);
      }
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="opacity-0 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-1">
              <span className="text-gradient">Historia</span> słuchania
            </h1>
            <p className="text-muted-foreground">
              Wszystkie Twoje ostatnio słuchane utwory
            </p>
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
        {(prediction || true) && (
          <div className="opacity-0 animate-fade-in rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl">🔮</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-lg">Przewidywanie</h3>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        Dla trybu 'Wszystko': analizujemy historię z ostatnich 30 dni i szukamy artystów słuchanych o podobnej porze (±2h). Dla innych trybów: bazujemy na 100 ostatnich utworach.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  {prediction?.factors?.totalTracks
                    ? `Na podstawie ${prediction.factors.totalTracks} odtworzeń z ${prediction.factors.uniqueDays || '?'} dni`
                    : 'Na podstawie wzorców'}
                </p>
              </div>
            </div>
            <p className="text-foreground mb-4 text-base">
              Dziś {(prediction?.time || "wieczorem")} najpewniej posłuchasz <span className="text-primary font-bold">{(prediction?.artist || "The Weeknd")}</span>
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-primary/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(prediction?.confidence || 85)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-primary">{(prediction?.confidence || 85)}%</span>
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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Muzyczna Ruletka</h3>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Bazując na Twoich top 3 artystach, Spotify generuje rekomendacje. Filtrujemy utwory już słuchane i preferujemy "hidden gems" (popularność 40-70%).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">Odkryj coś nowego</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Utwór dopasowany do Twojego gustu, którego jeszcze nie słuchałeś
          </p>
          <button
            onClick={spinRoulette}
            disabled={isSpinning}
            className="w-full py-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50"
          >
            <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? 'Szukam...' : 'Zakręć ruletką'}
          </button>
        </div>
      </section>


      {/* 🧬 Music DNA + Złote Godziny Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Music DNA */}
        <div className="opacity-0 animate-fade-in rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6" style={{ animationDelay: '550ms' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Dna className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-lg">Twoje Muzyczne DNA</h3>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Dla trybu 'Wszystko': pobieramy Audio Features z Spotify API dla Twoich top utworów. Dla innych trybów: obliczamy na podstawie godzin słuchania, powtórzeń utworów, różnorodności artystów i długości tracków.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">Profil soniczny</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: "Energia", value: musicDNA.energy, color: "bg-red-500" },
              { label: "Taneczność", value: musicDNA.danceability, color: "bg-pink-500" },
              { label: "Akustyka", value: musicDNA.acoustic, color: "bg-primary" },
              { label: "Nostalgia", value: musicDNA.nostalgia, color: "bg-purple-500" },
              { label: "Głośność", value: musicDNA.loudness, color: "bg-orange-500" },
            ].map(attr => (
              <div key={attr.label} className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 font-medium">{attr.label}</span>
                <div className="flex-1 h-3 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${attr.color} rounded-full transition-all duration-1000`}
                    style={{ width: `${attr.value}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground w-12 text-right">{attr.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 🌙 Złote Godziny */}
        <div className="opacity-0 animate-fade-in relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-lg">Złote Godziny</h3>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        Analizujemy CAŁĄ historię słuchania z bazy danych. Grupujemy odtworzenia wg godziny (0-23) i pokazujemy top 3. Dane zbierane automatycznie co ~1h.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">Twój rytm muzyczny</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {(() => {
              // Prefer server-side topHours if available, fallback to local heatmapData
              const sortedData = serverTopHours && serverTopHours.length > 0
                ? serverTopHours
                : [...heatmapData].sort((a, b) => b.count - a.count).slice(0, 3);
              const top1 = sortedData[0];
              const rest = sortedData.slice(1);

              const getTimeIcon = (h: number) => {
                if (h >= 5 && h < 12) return "🌅";
                if (h >= 12 && h < 17) return "☀️";
                if (h >= 17 && h < 21) return "🌇";
                return "🌙";
              };

              return (
                <>
                  {/* #1 Card - Green Gradient */}
                  {top1 && (
                    <div className="relative w-full rounded-2xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 p-5 pl-10">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-lg">
                        1
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getTimeIcon(top1.hour)}</span>
                          <span className="text-2xl font-bold text-foreground">{top1.hour}:00</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-primary">{top1.count}</span>
                          <span className="text-xs text-muted-foreground ml-1">odtw.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* #2 & #3 Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {rest.map((item, i) => (
                      <div key={item.hour} className="relative rounded-xl bg-secondary/20 border border-border/30 p-3 pl-8">
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-xs shadow-md">
                          {i + 2}
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{getTimeIcon(item.hour)}</span>
                            <span className="text-lg font-bold text-foreground">{item.hour}:00</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-medium text-muted-foreground">{item.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
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
                  src={isValidImageUrl(rouletteTrack.image) ? rouletteTrack.image : "/assets/default-album.svg"}
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
    </div>
  );
};

export default History;
