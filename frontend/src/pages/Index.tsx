import { Music, Headphones, Clock, TrendingUp, Cake, Mic2, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import StatsCard from "@/components/StatsCard";
import TopArtistCard from "@/components/TopArtistCard";
import TopTrackCard from "@/components/TopTrackCard";
// Lazy load heavy chart components (Recharts ~50KB)
const ListeningChart = lazy(() => import("@/components/ListeningChart"));
const GenreChart = lazy(() => import("@/components/GenreChart"));
import RecentlyPlayed from "@/components/RecentlyPlayed";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";
import { useUser, useTopArtists, useTopTracks, useRecentlyPlayed, mapTimeRange } from "@/hooks/useSpotifyData";
import { calculateTopGenres } from "@/lib/genreUtils";
import { calculateListeningAge, getAgeDescription } from "@/lib/listeningAge";
import { AxiosError } from "axios";

// Chart loading fallback
const ChartSkeleton = () => (
  <div className="h-[300px] rounded-2xl border border-border/40 bg-card animate-pulse flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

interface SpotifyArtist {
  name: string;
  image?: string;
  popularity?: number;
  genres?: string[];
  spotifyUrl?: string | null;
}

interface SpotifyTrack {
  name: string;
  artists?: { name: string }[];
  artist?: string;
  album?: { image?: string };
  duration?: number;
  previewUrl?: string | null;
  spotifyUrl?: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const apiTimeRange = mapTimeRange(timeRange);

  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: allArtists, isLoading: artistsLoading } = useTopArtists(apiTimeRange, 20);
  const { data: allTracks, isLoading: tracksLoading } = useTopTracks(apiTimeRange, 50);
  const { data: recentTracks, isLoading: recentLoading } = useRecentlyPlayed(50);

  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);

  const formattedArtists = (allArtists?.slice(0, 5) || []).map((artist: SpotifyArtist, index: number) => ({
    rank: index + 1,
    name: artist.name,
    image: artist.image || "/assets/default-album.svg",
    streams: artist.popularity?.toString() || "0",
    spotifyUrl: artist.spotifyUrl
  }));

  const formattedTracks = (allTracks?.slice(0, 5) || []).map((track: SpotifyTrack, index: number) => ({
    rank: index + 1,
    title: track.name,
    artist: track.artists?.[0]?.name || track.artist,
    image: track.album?.image || "/assets/default-album.svg",
    duration: track.duration ? `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}` : "3:00",
    previewUrl: track.previewUrl,
    spotifyUrl: track.spotifyUrl
  }));

  const listeningAge = calculateListeningAge(allTracks || []);
  const ageDescription = getAgeDescription(listeningAge);
  const { topGenreName: topGenre } = calculateTopGenres(allArtists);
  const isLoading = userLoading || artistsLoading || tracksLoading || recentLoading;

  const getTimeLabel = () => {
    return timeRange === "week" ? "Ten tydzień" : timeRange === "month" ? "Ten miesiąc" : timeRange === "year" ? "Ten rok" : "Wszystko";
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/20 blur-xl" />
          </div>
          <p className="text-muted-foreground text-sm">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="opacity-0 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-1">
              Witaj <span className="text-gradient">{user?.displayName || 'Użytkowniku'}</span>
            </h1>
            <p className="text-muted-foreground">
              Sprawdź swoje statystyki słuchania muzyki
            </p>
          </div>
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </section>

      {/* Stats Grid - Clean 4-column layout */}
      <section className="relative">
        {/* Subtle ambient glow */}
        <div className="absolute -top-20 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Top Artysta"
            value={formattedArtists[0]?.name || "-"}
            subtitle={getTimeLabel()}
            icon={Mic2}
            delay={100}
            variant="primary"
            tooltip="Pobieramy top 50 artystów z API Spotify dla wybranego okresu (Tydzień/Miesiąc/Rok). Ten kafelek pokazuje #1 z tej listy."
          />
          <StatsCard
            title="Top Utwór"
            value={formattedTracks[0]?.title || "-"}
            subtitle={formattedTracks[0]?.artist || getTimeLabel()}
            icon={Music}
            delay={150}
            variant="default"
            tooltip="Pobieramy top 50 utworów z API Spotify dla wybranego okresu. Ten kafelek pokazuje #1 z tej listy."
          />
          <StatsCard
            title="Wiek słuchania"
            value={listeningAge ? `${listeningAge} lat` : "-"}
            subtitle={ageDescription}
            icon={Cake}
            delay={200}
            variant="accent"
            tooltip="Średni rok wydania Twoich top 50 utworów z wybranego okresu. Im nowsze utwory słuchasz, tym 'młodszy' wiek."
          />
          <StatsCard
            title="Top Gatunek"
            value={topGenre}
            subtitle={getTimeLabel()}
            icon={TrendingUp}
            delay={250}
            variant="default"
            tooltip="Zliczamy gatunki wszystkich top 50 artystów z wybranego okresu i wybieramy najczęściej występujący."
          />
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <ListeningChart />
          </Suspense>
        </div>
        <div className="lg:col-span-1">
          <Suspense fallback={<ChartSkeleton />}>
            <GenreChart artists={allArtists} timeRange={timeRange} />
          </Suspense>
        </div>
      </section>

      {/* Top Content Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Tracks Section */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 flex flex-col opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />

          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="icon-container-sm">
                <Music className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Top Utwory</h2>
            </div>
            <a href="/top-tracks" className="text-sm text-primary hover:underline font-medium">
              Zobacz wszystko
            </a>
          </div>

          <div className="relative space-y-2 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : formattedTracks.length > 0 ? (
              formattedTracks.map((track, index) => (
                <TopTrackCard
                  key={`${track.title}-${index}`}
                  {...track}
                  delay={index * 80 + 500}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </div>
        </div>

        {/* Top Artists Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 flex flex-col h-full opacity-0 animate-fade-in" style={{ animationDelay: "450ms" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />

          <div className="relative flex items-center gap-3 mb-5">
            <div className="icon-container-sm">
              <Mic2 className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Top Artyści</h2>
          </div>

          <div className="relative space-y-2 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : formattedArtists.length > 0 ? (
              formattedArtists.map((artist, index) => (
                <TopArtistCard
                  key={`${artist.name}-${index}`}
                  {...artist}
                  delay={index * 80 + 550}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </div>
        </div>
      </section>

      {/* Recently Played */}
      <section>
        <RecentlyPlayed />
      </section>
    </div>
  );
};

export default Index;
