import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, TooltipProps } from "recharts";
import { useState } from "react";
import { useListeningChart, useSyncListeningHistory } from "@/hooks/useSpotifyData";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CustomTooltipProps = TooltipProps<number, string>;

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/50 rounded-xl px-4 py-3 shadow-xl shadow-black/20">
        <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
        <p className="text-primary font-bold">
          Utworów: <span className="text-lg">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const ListeningChart = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Fetch data from database instead of props
  const { data: chartData, isLoading } = useListeningChart(7);
  const syncMutation = useSyncListeningHistory();

  // Transform data for the chart
  const data = chartData?.days?.map(d => ({
    day: d.day,
    hours: d.count,
  })) || [
      { day: 'Poniedziałek', hours: 0 },
      { day: 'Wtorek', hours: 0 },
      { day: 'Środa', hours: 0 },
      { day: 'Czwartek', hours: 0 },
      { day: 'Piątek', hours: 0 },
      { day: 'Sobota', hours: 0 },
      { day: 'Niedziela', hours: 0 },
    ];

  const totalTracks = data.reduce((sum, d) => sum + d.hours, 0);
  const maxDay = data.reduce((max, d) => d.hours > max.hours ? d : max, data[0]);
  const avgTracks = Math.round(totalTracks / 7);

  // Format relative time for last sync
  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'przed chwilą';
    if (diffMins < 60) return `${diffMins} min temu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h temu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d temu`;
  };

  const lastPlayRelative = getRelativeTime(chartData?.stats?.lastPlay || null);
  const collectionActive = chartData?.stats?.collectionActive || false;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6 h-full flex flex-col opacity-0 animate-fade-in"
      style={{ animationDelay: "400ms" }}
    >
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">Aktywność</h2>
          <p className="text-sm text-muted-foreground">Utwory w ostatnich 7 dniach</p>
        </div>

        {/* Sync button with tooltip */}
        <TooltipProvider delayDuration={0}>
          <UITooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">
                {syncMutation.isPending ? 'Synchronizuję...' : 'Synchronizuj teraz'}
              </p>
              {lastPlayRelative && (
                <p className="text-xs text-muted-foreground">
                  Ostatni utwór: {lastPlayRelative}
                </p>
              )}
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[200px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={(state) => {
                if (state.activeTooltipIndex !== undefined) {
                  setActiveIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(141, 73%, 52%)" />
                  <stop offset="100%" stopColor="hsl(141, 73%, 35%)" />
                </linearGradient>
                <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(141, 73%, 60%)" />
                  <stop offset="100%" stopColor="hsl(141, 73%, 42%)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(0, 0%, 60%)',
                  fontSize: 13,
                  fontWeight: 500
                }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(0, 0%, 50%)',
                  fontSize: 12
                }}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(141, 73%, 42%, 0.1)', radius: 8 }}
              />
              <Bar
                dataKey="hours"
                radius={[8, 8, 0, 0]}
                maxBarSize={50}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={activeIndex === index ? "url(#barGradientActive)" : "url(#barGradient)"}
                    style={{
                      transition: 'fill 0.2s ease'
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats summary */}
      <div className="relative mt-4 pt-4 border-t border-border/30 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{totalTracks}</p>
          <p className="text-xs text-muted-foreground">Łącznie utworów</p>
        </div>
        <div className="text-center border-x border-border/30">
          <p className="text-xl font-bold text-primary">{maxDay.hours}</p>
          <p className="text-xs text-muted-foreground">{maxDay.day}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{avgTracks}</p>
          <p className="text-xs text-muted-foreground">Średnia/dzień</p>
        </div>
      </div>

      {/* Collection status indicator */}
      {!collectionActive && totalTracks === 0 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Zbieramy Twoją historię słuchania. Wróć później po więcej danych.
          </p>
        </div>
      )}
    </div>
  );
};

export default ListeningChart;
