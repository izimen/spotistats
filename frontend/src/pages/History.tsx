import { Shuffle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";
import { PageHeader, Section, Figure, FigureRow, EmptyNote } from "@/components/Editorial";
import { useUser, useListeningHistory, usePrediction, useListeningHeatmap } from "@/hooks/useSpotifyData";
import { usePeriodSummary } from "@/hooks/useInsights";
import ListenerProfile from "@/components/ListenerProfile";
import { toLocalDateString, plural } from "@/lib/period";
import { useHistoryStats } from "@/hooks/useHistoryStats";
import HistoryList from "@/components/HistoryList";
import { isValidImageUrl } from "@/lib/utils";
import { statsAPI } from "@/lib/api";

const RANGE_LABEL: Record<TimeRange, string> = {
  week: "ostatnich 4 tygodni",
  month: "ostatnich 6 miesięcy",
  year: "ostatniego roku",
};

const SECTIONS = [
  { id: "liczby", label: "Liczby" },
  { id: "profil", label: "Profil" },
  { id: "godziny", label: "Złote godziny" },
  { id: "przewidywanie", label: "Przewidywanie" },
  { id: "ruletka", label: "Ruletka" },
  { id: "ostatnie", label: "Ostatnie" },
];

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


const History = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  // All-time API stats (Music DNA, prediction, peak hours) used to be shown for the
  // removed "Wszystko" range; "1 Rok" (long_term) is now the widest range.
  const ALL_TIME_RANGE: TimeRange = "year";
  const [rouletteTrack, setRouletteTrack] = useState<HistoryTrack | null>(null);

  // Calculate date range based on timeRange
  const dateRange = useMemo(() => {
    const now = new Date();
    const from = new Date();

    // Must match the filter labels ("4 Tygodnie" / "6 Miesięcy" / "1 Rok") - it used to take 7 / 30 days
    switch (timeRange) {
      case 'week':
        from.setDate(now.getDate() - 28);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        break;
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

  // Listener profile for the selected range, computed server-side from all plays (local dates, `to` exclusive)
  const profileRange = useMemo(() => {
    const tomorrow = new Date(dateRange.to);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { from: toLocalDateString(dateRange.from), to: toLocalDateString(tomorrow) };
  }, [dateRange]);
  const { data: rangeSummary, isLoading: rangeSummaryLoading } = usePeriodSummary(profileRange.from, profileRange.to);

  // Memoized: a fresh `[]` on every render made formattedTracks and every derived stat recompute
  const recentTracks = useMemo(() => historyData?.plays || [], [historyData?.plays]);

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
    mostLooped: localMostLooped,
    prediction: localPrediction,
    heatmapData: localHeatmapData
  } = useHistoryStats(formattedTracks, serverTotalMinutes);

  // Prefer server stats, fallback to local
  const mostLooped = serverMostLooped
    ? { title: serverMostLooped.trackName, artist: serverMostLooped.artistName, image: serverMostLooped.albumImage, count: serverMostLooped.count }
    : localMostLooped;

  // Server-side all-time insights (only for the widest range). React Query caches them,
  // so going back to this page no longer refetches everything.
  const isAllTime = timeRange === ALL_TIME_RANGE;
  const { data: apiPrediction } = usePrediction(isAllTime);
  const { data: apiHeatmapAllTime } = useListeningHeatmap(isAllTime);

  // Heatmap for the selected range from the server's full hour distribution
  // (the local fallback only sees the 100 plays loaded on this page)
  const serverHourCounts = historyData?.stats?.hourCounts;
  const apiHeatmapRange = useMemo(() => {
    if (!serverHourCounts || serverHourCounts.length !== 24) return null;
    const max = Math.max(...serverHourCounts, 1);
    if (serverHourCounts.every((c) => c === 0)) return null;
    return serverHourCounts.map((count, hour) => ({ hour, count, intensity: count / max }));
  }, [serverHourCounts]);
  const apiHeatmap = isAllTime ? (apiHeatmapAllTime ?? apiHeatmapRange) : apiHeatmapRange;

  // Use API data if available, fallback to local calculation
  const prediction = (isAllTime && apiPrediction) || localPrediction;
  const heatmapData = apiHeatmap || localHeatmapData;

  // 🎲 Discovery Roulette - get new music recommendation from API
  const [isSpinning, setIsSpinning] = useState(false);

  const spinRoulette = async () => {
    setIsSpinning(true);
    try {
      const response = await statsAPI.getDiscoveryRoulette();
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
      } else {
        // Fallback to local selection if API fails
        const fallbackTrack = formattedTracks[Math.floor(Math.random() * formattedTracks.length)];
        if (fallbackTrack) {
          setRouletteTrack(fallbackTrack);
          }
      }
    } catch (error) {
      console.error('Roulette API error:', error);
      // Fallback to local selection
      const fallbackTrack = formattedTracks[Math.floor(Math.random() * formattedTracks.length)];
      if (fallbackTrack) {
        setRouletteTrack(fallbackTrack);
      }
    } finally {
      setIsSpinning(false);
    }
  };

  const minutesLabel = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`
    : `${totalMinutes} min`;
  const playsCount = historyData?.total ?? formattedTracks.length;
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: heatmapData.find(h => h.hour === hour)?.count ?? 0 }));
  const ranked = [...hours].sort((a, b) => b.count - a.count).filter(h => h.count > 0);
  // sentence, highlight and bars all from the same 24-hour distribution (server topHours only if it's empty)
  const topHours = (ranked.length > 0 ? ranked.slice(0, 3) : serverTopHours ?? []).filter(h => h.count > 0);
  const topHourSet = new Set(topHours.map(h => h.hour));
  const maxHour = Math.max(1, ...hours.map(h => h.count));
  const hasPrediction = Boolean(prediction?.artist && prediction?.factors?.totalTracks);
  const predictionNote = hasPrediction
    ? `Na podstawie ${prediction!.factors!.totalTracks} ${plural(prediction!.factors!.totalTracks, "odtworzenia", "odtworzeń", "odtworzeń")} z ${prediction!.factors!.uniqueDays ? `${prediction!.factors!.uniqueDays} ${plural(prediction!.factors!.uniqueDays, "dnia", "dni", "dni")}` : "? dni"}`
    : undefined;

  return (
    <div>
      <PageHeader
        title="Historia"
        meta={`Wszystko, co zapisaliśmy z ${RANGE_LABEL[timeRange]}. Synchronizacja co godzinę.`}
        controls={<TimeRangeFilter value={timeRange} onChange={setTimeRange} />}
      />

      <nav aria-label="Sekcje historii" className="sticky top-0 z-30 -mx-5 mb-12 border-b border-border bg-background px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <ul className="scrollbar-hide flex gap-6 overflow-x-auto py-3 text-sm font-semibold">
          {SECTIONS.map(s => (
            <li key={s.id} className="shrink-0">
              <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-16">
        <section id="liczby" className="scroll-mt-16" aria-label="Liczby">
          <FigureRow className="lg:grid-cols-3">
            <Figure
              label="Czas słuchania"
              value={isLoading ? "…" : minutesLabel}
              note={<Link to="/summary" className="underline decoration-primary decoration-2 underline-offset-4 hover:text-foreground">Porównaj z poprzednim miesiącem</Link>}
              emphasis
            />
            <Figure label="Odtworzenia" value={isLoading ? "…" : playsCount.toLocaleString("pl-PL")} />
            <Figure
              label="Najczęściej zapętlany"
              value={mostLooped?.title || "—"}
              note={mostLooped ? `${mostLooped.count} ${plural(mostLooped.count, "raz", "razy", "razy")}${mostLooped.artist ? `, ${mostLooped.artist}` : ""}` : "Brak powtórek"}
            />
          </FigureRow>
        </section>

        <Section id="profil" title="Profil słuchacza" note="Prawdziwe proporcje z Twoich odtworzeń w tym okresie">
          <ListenerProfile
            profile={rangeSummary?.profile}
            plays={rangeSummary?.totals.plays ?? 0}
            isLoading={rangeSummaryLoading}
          />
        </Section>

        <Section id="godziny" title="Złote godziny" note="Kiedy słuchasz najczęściej (czas polski)">
          {topHours.length > 0 ? (
            <>
              <p className="mb-8 type-head text-[clamp(1.6rem,4vw,2.4rem)]">
                Najczęściej o <span className="text-primary">{topHours[0].hour}:00</span>
                {topHours[1] && <>, potem o {topHours[1].hour}:00{topHours[2] && <> i {topHours[2].hour}:00</>}</>}.
              </p>
              <ol className="grid h-32 items-end gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }} aria-label="Odtworzenia według godziny">
                {hours.map(h => (
                  <li key={h.hour} className="flex h-full items-end" title={`${h.hour}:00 – ${h.count}`}>
                    <span
                      className={`block w-full ${topHourSet.has(h.hour) ? "bg-primary" : "bg-foreground/25"}`}
                      style={{ height: `${Math.max(2, (h.count / maxHour) * 100)}%` }}
                      aria-label={`${h.hour}:00: ${h.count}`}
                    />
                  </li>
                ))}
              </ol>
              <div className="mt-2 grid border-t border-border pt-2 text-xs text-muted-foreground" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {hours.map(h => <span key={h.hour} className="text-center">{h.hour % 6 === 0 ? h.hour : ""}</span>)}
              </div>
            </>
          ) : (
            <EmptyNote title="Za mało danych">Godziny pokażemy, gdy zapiszemy więcej odtworzeń.</EmptyNote>
          )}
        </Section>

        <Section id="przewidywanie" title="Przewidywanie" note={predictionNote}>
          {hasPrediction ? (
            <>
              <p className="type-head text-[clamp(1.6rem,4vw,2.4rem)]">
                Dziś {prediction!.time} najpewniej posłuchasz <span className="text-primary">{prediction!.artist}</span>.
              </p>
              <div className="mt-5 flex max-w-md items-center gap-4">
                <div className="h-[3px] flex-1 bg-border" role="meter" aria-label="Pewność" aria-valuenow={prediction!.confidence} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-primary" style={{ width: `${prediction!.confidence}%` }} />
                </div>
                <span className="tabular-nums text-sm text-muted-foreground">pewność {prediction!.confidence}%</span>
              </div>
            </>
          ) : (
            <EmptyNote title="Jeszcze nie wiemy">Przewidywanie pojawi się, gdy zapiszemy kilka dni słuchania.</EmptyNote>
          )}
        </Section>

        <Section id="ruletka" title="Ruletka" note="Utwór w klimacie Twoich ulubionych artystów, spoza Twojej historii">
          {rouletteTrack && (
            <div className="row-in mb-6 flex items-center gap-5" aria-live="polite">
              <img src={isValidImageUrl(rouletteTrack.image) ? rouletteTrack.image : "/assets/default-album.svg"} alt="" className="h-24 w-24 shrink-0 rounded-sm object-cover" />
              <div className="min-w-0">
                <p className="type-head truncate text-[28px]">{rouletteTrack.title}</p>
                <p className="truncate text-muted-foreground">{rouletteTrack.artist}</p>
                <a
                  href={rouletteTrack.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${rouletteTrack.title} ${rouletteTrack.artist}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold underline decoration-spotify decoration-2 underline-offset-4"
                >
                  Otwórz w Spotify
                </a>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={spinRoulette}
            disabled={isSpinning}
            className="touch-target inline-flex items-center gap-2 bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Shuffle className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} aria-hidden="true" />
            {isSpinning ? "Szukam…" : rouletteTrack ? "Losuj jeszcze raz" : "Wylosuj utwór"}
          </button>
        </Section>

        <Section id="ostatnie" title="Ostatnie odtworzenia" note="Czas słuchania liczony do następnego utworu, więc przewinięte utwory liczą się krócej">
          <HistoryList tracks={formattedTracks} isLoading={isLoading} />
        </Section>
      </div>
    </div>
  );
};

export default History;
