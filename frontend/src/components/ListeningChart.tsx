import { BarChart3, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
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
      <div className="relative overflow-hidden rounded-xl px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl border border-white/10">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-card/90" />

        {/* Gradient border effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-white/15 to-transparent" />

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative">
          <p className="text-sm font-semibold text-foreground mb-1.5">{label}</p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
            <span className="text-muted-foreground text-sm">Utworów:</span>
            <span className="text-lg font-bold text-primary">{payload[0].value}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const ListeningChart = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data: chartData, isLoading } = useListeningChart(7);
  const syncMutation = useSyncListeningHistory();

  // Shorten day names for chart display
  const shortenDayName = (day: string): string => {
    const shortNames: Record<string, string> = {
      'Poniedziałek': 'Pn',
      'Wtorek': 'Wt',
      'Środa': 'Śr',
      'Czwartek': 'Cz',
      'Piątek': 'Pt',
      'Sobota': 'Sb',
      'Niedziela': 'Nd',
    };
    return shortNames[day] || day;
  };

  const data = chartData?.days?.map(d => ({
    day: shortenDayName(d.day),
    hours: d.count,
  })) || [
      { day: 'Pn', hours: 0 },
      { day: 'Wt', hours: 0 },
      { day: 'Śr', hours: 0 },
      { day: 'Cz', hours: 0 },
      { day: 'Pt', hours: 0 },
      { day: 'Sb', hours: 0 },
      { day: 'Nd', hours: 0 },
    ];

  const totalTracks = data.reduce((sum, d) => sum + d.hours, 0);
  const maxDay = data.reduce((max, d) => d.hours > max.hours ? d : max, data[0]);
  const avgTracks = Math.round(totalTracks / 7);

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
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 h-full flex flex-col opacity-0 animate-fade-in"
      style={{ animationDelay: "400ms" }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-4 mb-6">
        <div className="icon-container">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Aktywność</h2>
          <p className="text-sm text-muted-foreground">Utwory w ostatnich 7 dniach</p>
        </div>

        {/* Sync button */}
        <TooltipProvider delayDuration={0}>
          <UITooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="w-9 h-9 rounded-xl bg-muted/50 hover:bg-primary/10 flex items-center justify-center transition-all text-muted-foreground hover:text-primary disabled:opacity-50"
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

      {/* Chart - switched to AreaChart for smoother look */}
      <div className="flex-1 min-h-[180px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(141, 76%, 48%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(141, 76%, 48%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(141, 76%, 45%)" />
                  <stop offset="50%" stopColor="hsl(141, 76%, 55%)" />
                  <stop offset="100%" stopColor="hsl(141, 76%, 45%)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(0, 0%, 50%)',
                  fontSize: 12,
                  fontWeight: 500
                }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'hsl(0, 0%, 45%)',
                  fontSize: 11
                }}
                width={35}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'hsl(141, 76%, 48%)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                fill="url(#areaFill)"
                dot={{
                  fill: 'hsl(141, 76%, 48%)',
                  stroke: 'hsl(var(--card))',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  fill: 'hsl(141, 76%, 55%)',
                  stroke: 'hsl(var(--card))',
                  strokeWidth: 3,
                  r: 6,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats summary - redesigned */}
      <div className="relative mt-4 pt-4 border-t border-border/30 grid grid-cols-3 gap-3">
        <div className="text-center p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <p className="text-xl font-bold text-foreground">{totalTracks}</p>
          <p className="text-xs text-muted-foreground">Łącznie</p>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-xl font-bold text-primary">{maxDay.hours}</p>
          <p className="text-xs text-muted-foreground">{maxDay.day}</p>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <p className="text-xl font-bold text-foreground">{avgTracks}</p>
          <p className="text-xs text-muted-foreground">Średnia</p>
        </div>
      </div>

      {/* Collection status */}
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
