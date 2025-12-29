import { Mic2, TrendingUp, Star, Music2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopArtistCard from "@/components/TopArtistCard";
import StatsCard from "@/components/StatsCard";
import TopItemsLayout from "@/components/TopItemsLayout";
import { type TimeRange } from "@/components/TimeRangeFilter";
import { useUser, useTopArtists, mapTimeRange } from "@/hooks/useSpotifyData";
import { AxiosError } from "axios";

interface SpotifyArtist {
  name: string;
  image?: string;
  popularity?: number;
  genres?: string[];
}

const TopArtists = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const apiTimeRange = mapTimeRange(timeRange);

  const { error: userError } = useUser();
  const { data: topArtists, isLoading } = useTopArtists(apiTimeRange, 20);

  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);

  // Format artists for display
  const formattedArtists = (topArtists || []).map((artist: SpotifyArtist, index: number) => ({
    rank: index + 1,
    name: artist.name,
    image: artist.image || "/assets/default-album.svg",
    streams: artist.popularity?.toString() || "0"
  }));

  // Get unique genres count
  const uniqueGenres = new Set(topArtists?.flatMap((a: SpotifyArtist) => a.genres || []) || []);

  const getTimeLabel = () => {
    return timeRange === "week" ? "Ten tydzień" : timeRange === "month" ? "Ten miesiąc" : "Cały rok";
  };

  return (
    <TopItemsLayout
      title="Top"
      highlightedTitle="Artyści"
      subtitle="Twoi ulubieni artyści"
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      statsCards={
        <>
          <StatsCard
            title="Top Artysta"
            value={topArtists?.[0]?.name || "-"}
            subtitle="Najczęściej słuchany"
            icon={Star}
            delay={100}
            variant="primary"
          />
          <StatsCard
            title="Gatunki muzyczne"
            value={uniqueGenres.size.toString()}
            subtitle="Różnorodność"
            icon={TrendingUp}
            delay={200}
          />
          <StatsCard
            title="Top Gatunek"
            value={topArtists?.[0]?.genres?.[0] || "Pop"}
            subtitle="Najczęściej słuchany"
            icon={Music2}
            delay={300}
          />
        </>
      }
      gridTitle="Wszyscy Artyści"
      gridSubtitle={`Top ${formattedArtists.length} - ${getTimeLabel()}`}
      gridIcon={Mic2}
      isLoading={isLoading}
      isEmpty={formattedArtists.length === 0}
    >
      {formattedArtists.map((artist, index) => (
        <TopArtistCard
          key={`${artist.name}-${index}`}
          {...artist}
          delay={index * 80 + 400}
        />
      ))}
    </TopItemsLayout>
  );
};

export default TopArtists;
