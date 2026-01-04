import { Music, Headphones, Clock, Zap } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopTrackCard from "@/components/TopTrackCard";
import StatsCard from "@/components/StatsCard";
import TopItemsLayout from "@/components/TopItemsLayout";
import { type TimeRange } from "@/components/TimeRangeFilter";
import { useUser, useTopTracks, useAudioFeatures, mapTimeRange } from "@/hooks/useSpotifyData";
import { AxiosError } from "axios";

interface SpotifyTrack {
  id: string;
  name: string;
  artists?: { name: string }[];
  artist?: string;
  album?: { image?: string };
  duration?: number;
  previewUrl?: string | null;
  spotifyUrl?: string | null;
}

const TopTracks = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const apiTimeRange = mapTimeRange(timeRange);

  const { error: userError } = useUser();
  const { data: topTracks, isLoading } = useTopTracks(apiTimeRange, 20);

  // Extract track IDs for audio features
  const trackIds = useMemo(() =>
    (topTracks || []).map((track: SpotifyTrack) => track.id).filter(Boolean),
    [topTracks]
  );

  // Fetch real audio features from Spotify
  const { data: audioFeatures } = useAudioFeatures(trackIds);

  // Log audio features in development only
  useEffect(() => {
    if (import.meta.env.DEV && audioFeatures) {
      console.log('[TopTracks] Audio Features:', {
        mood: audioFeatures.mood,
        averages: audioFeatures.averages,
        trackCount: audioFeatures.trackCount,
        timeRange: apiTimeRange
      });
    }
  }, [audioFeatures, apiTimeRange]);

  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);

  // Format tracks for display
  const formattedTracks = (topTracks || []).map((track: SpotifyTrack, index: number) => ({
    rank: index + 1,
    title: track.name,
    artist: track.artists?.[0]?.name || track.artist || "",
    image: track.album?.image || "/assets/default-album.svg",
    duration: track.duration ? `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}` : "3:00",
    durationMs: track.duration || 180000,
    previewUrl: track.previewUrl,
    spotifyUrl: track.spotifyUrl
  }));

  // Calculate total listening time in minutes
  const totalMinutes = Math.round(formattedTracks.reduce((acc, track) => acc + track.durationMs, 0) / 60000);

  // Get mood from real audio features or fallback to scoring-based analysis
  const getMood = () => {
    // Use real Spotify audio features if available
    if (audioFeatures?.mood) {
      return audioFeatures.mood;
    }

    if (formattedTracks.length === 0) return "🎵 Zrównoważony";

    // ============ METRICS ============
    const trackCount = formattedTracks.length;
    const uniqueArtists = new Set(formattedTracks.map(t => t.artist)).size;
    const artistVariety = uniqueArtists / trackCount;
    const shortRatio = formattedTracks.filter(t => t.durationMs < 180000).length / trackCount;
    const longRatio = formattedTracks.filter(t => t.durationMs > 300000).length / trackCount;

    // Combined text for analysis
    const combined = formattedTracks.map(t => `${t.title} ${t.artist}`).join(' ');

    // ============ KEYWORD PATTERNS (with word boundaries) ============
    const patterns: Record<string, RegExp> = {
      party: /\b(party|dance|club|remix|beat|bass|drop|rave|techno|house|disco|dj)\b/gi,
      chill: /\b(chill|lofi|relax|sleep|calm|ambient|acoustic|piano|soft|jazz|bossa)\b/gi,
      sad: /\b(sad|cry|crying|broken|lonely|pain|miss|lost|tears|blues|sorrow|goodbye)\b/gi,
      love: /\b(love|baby|kiss|forever|together|romance|darling|honey|amore|kochanie)\b/gi,
      rock: /\b(rock|metal|punk|grunge|alternative|guitar|heavy|hard)\b/gi,
      hiphop: /\b(trap|drill|rap|rapper|freestyle|flow|bars|feat)\b/gi,
      electronic: /\b(dubstep|trance|edm|electro|synth|wave)\b/gi
    };

    // Count matches
    const matchCount = (key: string): number => (combined.match(patterns[key]) || []).length;

    // ============ SCORING SYSTEM ============
    const scores: Record<string, number> = {
      party: matchCount('party') * 2 + (shortRatio > 0.5 ? 2 : 0),
      chill: matchCount('chill') * 2 + (longRatio > 0.3 ? 2 : 0),
      sad: matchCount('sad') * 3,
      love: matchCount('love') * 1.5,
      rock: matchCount('rock') * 2,
      hiphop: matchCount('hiphop') * 2,
      electronic: matchCount('electronic') * 2,
      energetic: 0,
      reflective: longRatio > 0.4 ? 3 : 0,
      focused: artistVariety < 0.3 ? 3 : 0
    };

    // Time context bonuses
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) { scores.chill += 2; scores.party -= 1; }
    if (hour >= 6 && hour < 10) { scores.energetic += 3; }
    if (hour >= 18 && hour < 22) { scores.chill += 1; }

    // Find top mood
    const sortedMoods = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const [topMood, topScore] = sortedMoods[0];

    if (topScore < 2) return "🎵 Zrównoważony";

    const moodEmojis: Record<string, string> = {
      party: "🎉 Imprezowy",
      chill: "😌 Spokojny",
      sad: "💔 Melancholijny",
      love: "💕 Romantyczny",
      rock: "🔥 Rockowy",
      hiphop: "🎤 Hip-Hopowy",
      electronic: "⚡ Elektroniczny",
      energetic: "💪 Energiczny",
      reflective: "💭 Refleksyjny",
      focused: "🎧 Skupiony"
    };

    return moodEmojis[topMood] || "🎵 Zrównoważony";
  };

  // Get average energy for display - fallback to listening time
  const getEnergy = () => {
    if (audioFeatures?.averages?.energy) {
      const energy = Math.round(audioFeatures.averages.energy * 100);
      return `${energy}%`;
    }
    // Fallback: show total time instead
    return `${totalMinutes} min`;
  };

  const getTimeLabel = () => {
    return timeRange === "week" ? "Ten tydzień" : timeRange === "month" ? "Ten miesiąc" : "Cały rok";
  };

  return (
    <TopItemsLayout
      title="Top"
      highlightedTitle="Utwory"
      subtitle="Twoje ulubione utwory"
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      statsCards={
        <>
          <StatsCard
            title="Top Utwór"
            value={formattedTracks[0]?.title || "-"}
            subtitle={formattedTracks[0]?.artist || ""}
            icon={Music}
            delay={100}
            variant="primary"
            tooltip="Pobieramy top 50 utworów z API Spotify dla wybranego okresu (Tydzień/Miesiąc/Rok). #1 z tej listy."
          />
          <StatsCard
            title="Energia"
            value={getEnergy()}
            subtitle="Średnia energia"
            icon={Zap}
            delay={200}
            tooltip="Pobieramy Audio Features dla top 50 utworów z Spotify API, liczymy średnią wartość 'energy' (0-100%). Jeśli API nie zwróci danych, pokazujemy łączny czas."
          />
          <StatsCard
            title="Mood"
            value={getMood()}
            subtitle="Na podstawie Spotify"
            icon={Headphones}
            delay={300}
            tooltip="Analiza Audio Features (energy, valence, danceability) top 50 utworów. Jeśli valence>0.7 i energy>0.7 = Imprezowy, valence<0.3 = Melancholijny, itd."
          />
        </>
      }
      gridTitle="Wszystkie Utwory"
      gridSubtitle={`Top ${formattedTracks.length} - ${getTimeLabel()}`}
      gridIcon={Music}
      isLoading={isLoading}
      isEmpty={formattedTracks.length === 0}
    >
      {formattedTracks.map((track, index) => (
        <TopTrackCard
          key={`${track.title}-${index}`}
          {...track}
          delay={index * 80 + 400}
        />
      ))}
    </TopItemsLayout>
  );
};

export default TopTracks;
