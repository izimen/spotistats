import React from "react";
import { Music2, TrendingUp, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateTopGenres, Artist } from "@/lib/genreUtils";

interface GenreChartProps {
  artists?: Artist[];
  timeRange?: string;
}

/**
 * Genre Chart Component - V2 Algorithm
 *
 * Uses shared logic from genreUtils to:
 * 1. normalize genres
 * 2. weigh by rank (sqrt)
 * 3. divide by genre count
 */
const GenreChart = React.memo(({ artists, timeRange = "month" }: GenreChartProps) => {
  const { topGenres: genres, topGenreName } = calculateTopGenres(artists || []);
  const artistCount = (artists || []).length;

  // Handle empty state
  if (artistCount === 0 || genres.length === 0) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6 h-full flex flex-col items-center justify-center opacity-0 animate-fade-in"
        style={{ animationDelay: "500ms" }}
      >
        <Music2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Brak danych</h2>
        <p className="text-sm text-muted-foreground text-center">
          Słuchaj muzyki na Spotify, aby zobaczyć swoje ulubione gatunki
        </p>
      </div>
    );
  }

  const topGenre = topGenreName;

  const timeLabel = timeRange === "week" ? "Ten tydzień"
    : timeRange === "month" ? "Ten miesiąc"
      : timeRange === "year" ? "Ten rok"
        : "Wszystko";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6 h-full flex flex-col opacity-0 animate-fade-in"
      style={{ animationDelay: "500ms" }}
    >
      {/* Background glow */}
      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

      {/* Header */}
      <div className="relative flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
            <Music2 className="w-6 h-6 text-primary" />
          </div>
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Ulubione gatunki</h2>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs z-50">
                  <p className="text-xs">
                    Artyści zajmujący wyższe pozycje w rankingu mają większy wpływ na wynik. Waga artysty jest równo dzielona między jego gatunki, a szczegółowe nazwy są łączone w główne kategorie (np. „polish hip hop" → „Hip Hop").
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">{timeLabel} • {artistCount} artystów</p>
        </div>
      </div>

      {/* Genre bars */}
      <div className="relative flex-1 space-y-4">
        {genres.map((genre, index) => (
          <div
            key={genre.name}
            className="group cursor-pointer opacity-0 animate-slide-up"
            style={{ animationDelay: `${600 + index * 100}ms` }}
          >
            <div className="flex justify-between items-center mb-2 gap-2">
              <span
                className="font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1"
                title={genre.name}
              >
                {genre.name}
              </span>
              <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                {genre.percentage}%
              </span>
            </div>

            <div
              className="h-2.5 bg-secondary/50 rounded-full overflow-hidden relative"
              role="progressbar"
              aria-label={`${genre.name}: ${genre.percentage}%`}
              aria-valuenow={genre.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full relative overflow-hidden transition-all duration-700 ease-out group-hover:shadow-[0_0_12px_hsl(141_73%_42%/0.4)] will-change-transform"
                style={{
                  width: `${genre.percentage}%`,
                  background: `linear-gradient(90deg, hsl(141, 73%, 42%), hsl(141, 73%, ${52 - index * 5}%))`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer stat */}
      <div className="relative mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="truncate">{topGenre} dominuje</span>
        </div>
        <a href="/statistics" className="text-sm text-primary hover:underline font-medium shrink-0">
          Szczegóły
        </a>
      </div>
    </div>
  );
});

GenreChart.displayName = "GenreChart";

export default GenreChart;
