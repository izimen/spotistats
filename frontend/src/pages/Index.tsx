import { Music, Headphones, Clock, TrendingUp, Cake, Mic2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatsCard from "@/components/StatsCard";
import TopArtistCard from "@/components/TopArtistCard";
import TopTrackCard from "@/components/TopTrackCard";
import ListeningChart from "@/components/ListeningChart";
import GenreChart from "@/components/GenreChart";
import RecentlyPlayed from "@/components/RecentlyPlayed";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";
import { useUser, useTopArtists, useTopTracks, useRecentlyPlayed, mapTimeRange } from "@/hooks/useSpotifyData";
import { calculateTopGenres } from "@/lib/genreUtils";
import { calculateListeningAge, getAgeDescription } from "@/lib/listeningAge";
import { AxiosError } from "axios";

interface SpotifyArtist {
  name: string;
  image?: string;
  popularity?: number;
  genres?: string[];
}

interface SpotifyTrack {
  name: string;
  artists?: { name: string }[];
  artist?: string;
  album?: { image?: string };
  duration?: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const apiTimeRange = mapTimeRange(timeRange);


  // API hooks - consolidated: fetch max needed, slice for display
  const { data: user, isLoading: userLoading, error: userError } = useUser();
  // Fetch 20 artists (used for display top 5 + genres calculation)
  const { data: allArtists, isLoading: artistsLoading } = useTopArtists(apiTimeRange, 20);
  // Fetch 50 tracks (used for display top 5 + listening age calculation)
  const { data: allTracks, isLoading: tracksLoading } = useTopTracks(apiTimeRange, 50);
  const { data: recentTracks, isLoading: recentLoading } = useRecentlyPlayed(50);

  // Only redirect on 401 error (not authenticated)
  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);


  // Format artists for display (top 5)
  const formattedArtists = (allArtists?.slice(0, 5) || []).map((artist: SpotifyArtist, index: number) => ({
    rank: index + 1,
    name: artist.name,
    image: artist.image || "/assets/default-album.svg",
    streams: artist.popularity?.toString() || "0"
  }));

  // Format tracks for display (top 5)
  const formattedTracks = (allTracks?.slice(0, 5) || []).map((track: SpotifyTrack, index: number) => ({
    rank: index + 1,
    title: track.name,
    artist: track.artists?.[0]?.name || track.artist,
    image: track.album?.image || "/assets/default-album.svg",
    duration: track.duration ? `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}` : "3:00"
  }));

  // Calculate stats
  // "Listening Age" - based on average release year of top tracks
  const listeningAge = calculateListeningAge(allTracks || []);
  const ageDescription = getAgeDescription(listeningAge);

  // "Top Genre" - using V2 algorithm (same as chart)
  const { topGenreName: topGenre } = calculateTopGenres(allArtists);

  const isLoading = userLoading || artistsLoading || tracksLoading || recentLoading;

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="mb-12 opacity-0 animate-fade-in">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              Witaj <span className="text-primary">{user?.displayName || 'Użytkowniku'}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Sprawdź swoje statystyki słuchania muzyki test
            </p>
          </div>
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        <StatsCard
          title="Top Artysta"
          value={formattedArtists[0]?.name || "-"}
          subtitle={timeRange === "week" ? "Ten tydzień" : timeRange === "month" ? "Ten miesiąc" : timeRange === "year" ? "Ten rok" : "Wszystko"}
          icon={Mic2}
          delay={100}
          variant="primary"
        />
        <StatsCard
          title="Top Utwór"
          value={formattedTracks[0]?.title || "-"}
          subtitle={timeRange === "week" ? "Ten tydzień" : timeRange === "month" ? "Ten miesiąc" : timeRange === "year" ? "Ten rok" : "Wszystko"}
          icon={Music}
          delay={200}
          variant="default"
        />
        <StatsCard
          title="Wiek słuchania"
          value={listeningAge ? `${listeningAge} lat` : "-"}
          subtitle={ageDescription}
          icon={Cake}
          delay={300}
          variant="accent"
        />
        <StatsCard
          title="Top Gatunek"
          value={topGenre}
          subtitle={timeRange === "week" ? "Ten tydzień" : timeRange === "month" ? "Ten miesiąc" : timeRange === "year" ? "Ten rok" : "Wszystko"}
          icon={TrendingUp}
          delay={400}
          variant="default"
        />
      </section>

      {/* Charts Row - Equal Height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ListeningChart />
        </div>
        <div className="lg:col-span-1">
          <GenreChart artists={allArtists} timeRange={timeRange} />
        </div>
      </div>

      {/* Top Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 items-stretch">
        {/* Top Tracks Section */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6 flex flex-col">
          {/* Background glow */}
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

          <div className="relative flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Top Utwory</h2>
            </div>
            <a href="/top-tracks" className="text-sm text-primary hover:underline font-medium">
              Zobacz wszystko
            </a>
          </div>
          <div className="relative space-y-3 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : formattedTracks.length > 0 ? (
              formattedTracks.map((track, index) => (
                <TopTrackCard
                  key={`${track.title}-${index}`}
                  {...track}
                  delay={index * 100 + 500}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </div>
        </div>

        {/* Top Artists Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6 flex flex-col h-full">
          {/* Background glow */}
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

          <div className="relative flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                <Mic2 className="w-5 h-5 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Top Artyści</h2>
          </div>
          <div className="relative space-y-3 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : formattedArtists.length > 0 ? (
              formattedArtists.map((artist, index) => (
                <TopArtistCard
                  key={`${artist.name}-${index}`}
                  {...artist}
                  delay={index * 100 + 600}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </div>
        </div>
      </div>

      {/* Recently Played */}
      <RecentlyPlayed />
    </>
  );
};

export default Index;
