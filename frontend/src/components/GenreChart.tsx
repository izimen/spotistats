import React from "react";
import { Music2, Info } from "lucide-react";
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

// Enhanced color palette for genre bars
const genreColors = [
  { from: "hsl(141, 76%, 48%)", to: "hsl(141, 76%, 38%)" }, // Primary green
  { from: "hsl(151, 70%, 45%)", to: "hsl(151, 70%, 35%)" }, // Teal green
  { from: "hsl(161, 65%, 42%)", to: "hsl(161, 65%, 32%)" }, // Cyan green
  { from: "hsl(171, 60%, 40%)", to: "hsl(171, 60%, 30%)" }, // Turquoise
  { from: "hsl(181, 55%, 38%)", to: "hsl(181, 55%, 28%)" }, // Blue-green
];

const GenreChart = React.memo(({ artists, timeRange = "month" }: GenreChartProps) => {
  const { topGenres: genres } = calculateTopGenres(artists || [], 5);
  const artistCount = (artists || []).length;

  // Handle empty state
  if (artistCount === 0 || genres.length === 0) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 h-full flex flex-col items-center justify-center opacity-0 animate-fade-in"
        style={{ animationDelay: "500ms" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Music2 className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Brak danych</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[200px]">
          Słuchaj muzyki na Spotify, aby zobaczyć swoje ulubione gatunki
        </p>
      </div>
    );
  }

  const maxPercentage = genres[0]?.percentage || 100;

  const timeLabel = timeRange === "week" ? "Ten tydzień"
    : timeRange === "month" ? "Ten miesiąc"
      : timeRange === "year" ? "Ten rok"
        : "Wszystko";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 h-full flex flex-col opacity-0 animate-fade-in"
      style={{ animationDelay: "500ms" }}
    >
      {/* Subtle background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-4 mb-6">
        <div className="icon-container">
          <Music2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Ulubione gatunki</h2>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs z-50">
                  <p className="text-xs">
                    Artyści wyżej w rankingu mają większy wpływ. Podobne gatunki są grupowane (np. "polish hip hop" → "Hip Hop").
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">{timeLabel} • {artistCount} artystów</p>
        </div>
      </div>

      {/* Genre bars - enhanced styling */}
      <div className="relative flex-1 space-y-4">
        {genres.map((genre, index) => {
          const color = genreColors[index % genreColors.length];
          // Scale bar to make differences more visible
          const scaledWidth = (genre.percentage / maxPercentage) * 100;

          return (
            <div
              key={genre.name}
              className="group cursor-pointer opacity-0 animate-slide-up"
              style={{ animationDelay: `${600 + index * 80}ms` }}
            >
              <div className="flex justify-between items-center mb-2 gap-2">
                <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1">
                  {genre.name}
                </span>
                <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors shrink-0 tabular-nums">
                  {genre.percentage}%
                </span>
              </div>

              <div
                className="h-2 bg-muted/30 rounded-full overflow-hidden relative"
                role="progressbar"
                aria-label={`${genre.name}: ${genre.percentage}%`}
                aria-valuenow={genre.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {/* Bar fill with gradient */}
                <div
                  className="h-full rounded-full relative overflow-hidden transition-all duration-700 ease-out group-hover:shadow-[0_0_16px_hsl(141_76%_48%/0.4)]"
                  style={{
                    width: `${scaledWidth}%`,
                    background: `linear-gradient(90deg, ${color.from}, ${color.to})`
                  }}
                >
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

GenreChart.displayName = "GenreChart";

export default GenreChart;
