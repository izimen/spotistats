import { BarChart3, TrendingUp, Clock, Music, Headphones, Calendar, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatsCard from "@/components/StatsCard";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";
import { useUser, useTopArtists, useRecentlyPlayed, mapTimeRange } from "@/hooks/useSpotifyData";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { AxiosError } from "axios";

interface SpotifyArtist {
  name: string;
  genres?: string[];
}

interface RecentTrack {
  playedAt: string;
  artist?: string;
  track?: {
    artists?: { name: string }[];
    duration_ms?: number;
  };
}

// Colors for pie chart
const COLORS = [
  "hsl(141 73% 42%)",
  "hsl(141 73% 52%)",
  "hsl(141 50% 35%)",
  "hsl(141 40% 28%)",
  "hsl(0 0% 40%)",
];

const Statistics = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const apiTimeRange = mapTimeRange(timeRange);

  // API hooks
  const { error: userError } = useUser();
  const { data: topArtists, isLoading: artistsLoading } = useTopArtists(apiTimeRange, 50);
  const { data: recentTracks, isLoading: recentLoading } = useRecentlyPlayed(50);

  // Redirect on 401
  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) {
      navigate('/login');
    }
  }, [userError, navigate]);

  // Calculate genre distribution from top artists
  const genreDistribution = (() => {
    if (!topArtists) return [];
    const genreCount: Record<string, number> = {};
    topArtists.forEach((artist: SpotifyArtist) => {
      (artist.genres || []).forEach((genre: string) => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });
    const sorted = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);
    return sorted.map(([name, count], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((count / total) * 100),
      color: COLORS[index % COLORS.length]
    }));
  })();

  // Calculate listening stats from recent tracks
  const todayCount = (recentTracks || []).filter((item: RecentTrack) => {
    const playedAt = new Date(item.playedAt);
    const today = new Date();
    return playedAt.toDateString() === today.toDateString();
  }).length;

  const uniqueArtists = new Set(
    (recentTracks || []).map((item: RecentTrack) => item.track?.artists?.[0]?.name || item.artist)
  ).size;

  // Estimate listening time from recent tracks (rough estimate)
  const totalMinutes = (recentTracks || []).reduce((sum: number, item: RecentTrack) => {
    return sum + (item.track?.duration_ms || 180000) / 60000;
  }, 0);
  const estimatedHours = Math.round(totalMinutes / 60 * 10) / 10;

  // Generate listening data based on recent tracks (grouped by day of week)
  const generateListeningData = () => {
    const days = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    (recentTracks || []).forEach((item: RecentTrack) => {
      const day = new Date(item.playedAt).getDay();
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    return days.map((name, index) => ({
      name,
      hours: Math.round((dayCount[index] * 3.5) / 10) / 10 // Rough estimate: 3.5 min avg per track
    }));
  };

  const listeningData = generateListeningData();

  // Generate monthly data (placeholder - would need extended history)
  const monthlyData = [
    { name: "Pon", tracks: Math.max(listeningData[1]?.hours * 10, 5) },
    { name: "Wt", tracks: Math.max(listeningData[2]?.hours * 10, 5) },
    { name: "Śr", tracks: Math.max(listeningData[3]?.hours * 10, 5) },
    { name: "Czw", tracks: Math.max(listeningData[4]?.hours * 10, 5) },
    { name: "Pt", tracks: Math.max(listeningData[5]?.hours * 10, 5) },
    { name: "Sob", tracks: Math.max(listeningData[6]?.hours * 10, 5) },
    { name: "Nd", tracks: Math.max(listeningData[0]?.hours * 10, 5) },
  ];

  const isLoading = artistsLoading || recentLoading;

  if (isLoading) {
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
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
                <span className="text-primary">Statystyki</span> słuchania
              </h1>
              <p className="text-lg text-muted-foreground">
                Szczegółowa analiza Twoich nawyków muzycznych
              </p>
            </div>
          </div>
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        <StatsCard
          title="Ostatnio słuchane"
          value={(recentTracks?.length || 0).toString()}
          subtitle="Utworów w historii"
          icon={Clock}
          delay={100}
          variant="primary"
        />
        <StatsCard
          title="Dzisiaj"
          value={todayCount.toString()}
          subtitle="Utworów odsłuchanych"
          icon={Music}
          delay={200}
        />
        <StatsCard
          title="Szacowany czas"
          value={`${estimatedHours}h`}
          subtitle="Z ostatnich 50 utworów"
          icon={Headphones}
          delay={300}
        />
        <StatsCard
          title="Unikalni artyści"
          value={uniqueArtists.toString()}
          subtitle="W ostatnich odsłuchaniach"
          icon={Calendar}
          delay={400}
        />
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly listening chart */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

          <div className="relative flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Aktywność tygodniowa</h2>
              <p className="text-sm text-muted-foreground">Na podstawie ostatnich utworów</p>
            </div>
          </div>

          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={listeningData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(141 73% 42%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(141 73% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis dataKey="name" stroke="hsl(0 0% 60%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 10%)',
                    border: '1px solid hsl(0 0% 20%)',
                    borderRadius: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(141 73% 42%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tracks by day chart */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

          <div className="relative flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Utwory dziennie</h2>
              <p className="text-sm text-muted-foreground">Rozkład w tygodniu</p>
            </div>
          </div>

          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis dataKey="name" stroke="hsl(0 0% 60%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 10%)',
                    border: '1px solid hsl(0 0% 20%)',
                    borderRadius: '12px'
                  }}
                />
                <Bar
                  dataKey="tracks"
                  fill="hsl(141 73% 42%)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Genre distribution */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

        <div className="relative flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Rozkład gatunków</h2>
            <p className="text-sm text-muted-foreground">Na podstawie Twoich top artystów</p>
          </div>
        </div>

        <div className="relative flex flex-col lg:flex-row items-center gap-8">
          {genreDistribution.length > 0 ? (
            <>
              <div className="h-64 w-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genreDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {genreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0 0% 10%)',
                        border: '1px solid hsl(0 0% 20%)',
                        borderRadius: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {genreDistribution.map((genre) => (
                  <div
                    key={genre.name}
                    className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center"
                  >
                    <div
                      className="w-4 h-4 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: genre.color }}
                    />
                    <p className="text-sm font-medium text-foreground">{genre.name}</p>
                    <p className="text-2xl font-bold text-primary">{genre.value}%</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8 w-full">Brak danych o gatunkach</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Statistics;
