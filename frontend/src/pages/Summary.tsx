import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Clock, Disc3, Download, Flame, Mic2, Play, Share2, Sparkles, Sun, Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ListenerProfile from "@/components/ListenerProfile";
import ListeningCalendar from "@/components/ListeningCalendar";
import { useUser } from "@/hooks/useSpotifyData";
import { usePeriodSummary, type RankedItem } from "@/hooks/useInsights";
import { statsAPI } from "@/lib/api";
import { isValidImageUrl } from "@/lib/utils";
import { isPreviewMode } from "@/lib/mockData";
import {
  type Period, type PeriodKind, formatDayLong, formatMinutes, isCurrentOrFuture, periodContaining,
  periodLabel, plural, previousPeriodLabel, shiftPeriod, toLocalDateString,
} from "@/lib/period";
import { canvasToBlob, downloadBlob, drawShareCard, shareOrDownload } from "@/lib/shareCard";

function ChangeBadge({ value, vs }: { value: number | null; vs: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">brak danych z okresu {vs}</span>;
  const up = value > 0;
  const color = value === 0 ? "text-muted-foreground" : up ? "text-primary" : "text-orange-400";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {up ? "+" : ""}{value}% <span className="text-muted-foreground font-normal">vs {vs}</span>
    </span>
  );
}

function StatTile({ icon, label, value, change, vs, delay }: {
  icon: React.ReactNode; label: string; value: string; change: number | null; vs: string; delay: number;
}) {
  return (
    <div className="opacity-0 animate-fade-in rounded-2xl border border-border/50 bg-card/60 p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">{icon}{label}</div>
      <div className="text-3xl font-bold text-foreground tabular-nums mb-1">{value}</div>
      <ChangeBadge value={change} vs={vs} />
    </div>
  );
}

function RankedList({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: RankedItem[]; empty: string }) {
  const max = items[0]?.plays || 1;
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">{icon}</div>
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={`${item.name}-${item.artist ?? ""}`} className="flex items-center gap-3">
              <span className={`w-6 text-sm font-bold tabular-nums ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
              <img
                src={isValidImageUrl(item.image) ? item.image! : "/assets/default-album.svg"}
                alt=""
                loading="lazy"
                className="w-10 h-10 rounded-lg object-cover bg-muted"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                {item.artist && <div className="text-xs text-muted-foreground truncate">{item.artist}</div>}
                <div className="mt-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full bg-primary/70 rounded-full" style={{ width: `${(item.plays / max) * 100}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold tabular-nums">{item.plays}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">{formatMinutes(item.minutes)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const Summary = () => {
  const navigate = useNavigate();
  const { data: user, error: userError } = useUser();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [period, setPeriod] = useState<Period>(() => periodContaining("month"));
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (userError && (userError as AxiosError)?.response?.status === 401) navigate("/login");
  }, [userError, navigate]);

  const { data: summary, isLoading, isFetching, isError } = usePeriodSummary(period.from, period.to);

  const title = periodLabel(period);
  const vs = previousPeriodLabel(period);
  const isCurrent = isCurrentOrFuture(period);
  const firstDataDate = summary?.dataRange.first ? toLocalDateString(new Date(summary.dataRange.first)) : null;
  const canGoBack = !firstDataDate || period.from > firstDataDate;

  const switchKind = (next: PeriodKind) => {
    setKind(next);
    // keep the same point in time: month -> its year; year -> current month (this year) or December
    let anchor: Date;
    if (next === "year") anchor = new Date(`${period.from}T00:00:00`);
    else if (isCurrentOrFuture(period)) anchor = new Date();
    else anchor = new Date(`${period.from.slice(0, 4)}-12-01T00:00:00`);
    setPeriod(periodContaining(next, anchor));
  };

  const totals = summary?.totals;
  const heroLine = useMemo(() => {
    if (!summary || !totals || totals.plays === 0) return null;
    const top = summary.topArtists[0];
    const parts = [`${formatMinutes(totals.minutes)} muzyki`];
    if (top) parts.push(`najczęściej ${top.name}`);
    if (summary.newArtists.count > 0) {
      parts.push(`${summary.newArtists.count} ${plural(summary.newArtists.count, "nowy artysta", "nowi artyści", "nowych artystów")}`);
    }
    return parts.join(" · ");
  }, [summary, totals]);

  const handleShare = async () => {
    if (!summary) return;
    setSharing(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      drawShareCard(canvas, summary, title.charAt(0).toUpperCase() + title.slice(1), user?.displayName);
      const blob = await canvasToBlob(canvas);
      const result = await shareOrDownload(blob, `spotistats-${period.from.slice(0, period.kind === "year" ? 4 : 7)}.png`, `SpotiStats – ${title}`);
      if (result === "downloaded") toast.success("Zapisano obrazek z podsumowaniem");
    } catch {
      toast.error("Nie udało się wygenerować obrazka");
    } finally {
      setSharing(false);
    }
  };

  const handleExport = async () => {
    if (isPreviewMode()) {
      toast.info("Eksport działa tylko z prawdziwym backendem");
      return;
    }
    setExporting(true);
    try {
      const response = await statsAPI.exportHistoryCsv();
      downloadBlob(response.data, `spotistats-historia-${toLocalDateString(new Date())}.csv`);
      toast.success("Pobrano historię jako CSV");
    } catch {
      toast.error("Eksport nie powiódł się, spróbuj ponownie");
    } finally {
      setExporting(false);
    }
  };

  const empty = !isLoading && totals?.plays === 0;

  return (
    <div className="space-y-8">
      {/* Header + period picker */}
      <section className="opacity-0 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-1">
              <span className="text-gradient">Podsumowanie</span>
            </h1>
            <p className="text-muted-foreground">Twój własny „Wrapped” – na dowolny miesiąc albo rok, z całej zebranej historii</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center bg-muted/40 rounded-full p-1 border border-border/30" role="group" aria-label="Rodzaj okresu">
              {(["month", "year"] as const).map(k => (
                <button
                  key={k}
                  onClick={() => k !== kind && switchKind(k)}
                  aria-pressed={kind === k}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${kind === k ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {k === "month" ? "Miesiąc" : "Rok"}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1 bg-muted/40 rounded-full p-1 border border-border/30">
              <button
                onClick={() => setPeriod(p => shiftPeriod(p, -1))}
                disabled={!canGoBack}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Poprzedni okres"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[140px] text-center text-sm font-semibold capitalize tabular-nums" aria-live="polite">{title}</span>
              <button
                onClick={() => setPeriod(p => shiftPeriod(p, 1))}
                disabled={isCurrent}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Następny okres"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {isError && !summary && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
          Nie udało się pobrać podsumowania. Odśwież stronę za chwilę.
        </div>
      )}

      {/* Hero */}
      <section className={`opacity-0 animate-fade-in relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-8 transition-opacity ${isFetching && summary ? "opacity-70" : ""}`} style={{ animationDelay: "100ms" }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-2 capitalize">{title}{isCurrent ? " · trwa" : ""}</p>
            {isLoading ? (
              <Skeleton className="h-14 w-64" />
            ) : (
              <div className="text-5xl md:text-6xl font-extrabold tabular-nums">
                {(totals?.minutes ?? 0).toLocaleString("pl-PL")} <span className="text-2xl md:text-3xl font-semibold text-muted-foreground">min</span>
              </div>
            )}
            <p className="text-muted-foreground mt-2">
              {empty ? "Brak odtworzeń w tym okresie – SpotiStats zbiera historię od chwili zalogowania (albo importu danych ze Spotify)." : heroLine ?? " "}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleShare}
              disabled={!summary || empty || sharing}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Share2 className="w-4 h-4" /> {sharing ? "Generuję…" : "Udostępnij kartę"}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-5 py-2.5 text-sm font-medium hover:bg-muted/70 disabled:opacity-40"
              title="Cała historia z bazy SpotiStats (wszystkie okresy)"
            >
              <Download className="w-4 h-4" /> {exporting ? "Pobieram…" : "Eksport CSV"}
            </button>
          </div>
        </div>
      </section>

      {/* Stat tiles with change vs previous period */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />)
        ) : (
          <>
            <StatTile delay={150} icon={<Clock className="w-4 h-4" />} label="Minuty" value={(totals?.minutes ?? 0).toLocaleString("pl-PL")} change={summary?.change.minutes ?? null} vs={vs} />
            <StatTile delay={200} icon={<Play className="w-4 h-4" />} label="Odtworzenia" value={(totals?.plays ?? 0).toLocaleString("pl-PL")} change={summary?.change.plays ?? null} vs={vs} />
            <StatTile delay={250} icon={<Users className="w-4 h-4" />} label="Artyści" value={(totals?.uniqueArtists ?? 0).toLocaleString("pl-PL")} change={summary?.change.uniqueArtists ?? null} vs={vs} />
            <StatTile delay={300} icon={<Sun className="w-4 h-4" />} label="Dni z muzyką" value={`${totals?.activeDays ?? 0}/${summary?.period.days ?? "–"}`} change={summary?.change.activeDays ?? null} vs={vs} />
          </>
        )}
      </section>

      {/* Top lists */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[420px] rounded-2xl" />
            <Skeleton className="h-[420px] rounded-2xl" />
          </>
        ) : (
          <>
            <RankedList title="Top artyści" icon={<Mic2 className="w-5 h-5 text-primary" />} items={summary?.topArtists ?? []} empty="Brak odtworzeń w tym okresie." />
            <RankedList title="Top utwory" icon={<Disc3 className="w-5 h-5 text-primary" />} items={summary?.topTracks ?? []} empty="Brak odtworzeń w tym okresie." />
          </>
        )}
      </section>

      {/* Discoveries + highlights + profile */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center"><Sparkles className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Odkrycia</h3>
              <p className="text-xs text-muted-foreground">Artyści po raz pierwszy w Twojej historii</p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : summary && summary.newArtists.count > 0 ? (
            <>
              <div className="text-3xl font-bold mb-4 tabular-nums">{summary.newArtists.count} <span className="text-base font-medium text-muted-foreground">{plural(summary.newArtists.count, "nowy artysta", "nowi artyści", "nowych artystów")}</span></div>
              <ul className="space-y-2">
                {summary.newArtists.items.slice(0, 6).map(a => (
                  <li key={a.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{a.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">{a.plays} {plural(a.plays, "raz", "razy", "razy")}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">W tym okresie nie pojawił się nikt nowy.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center"><Flame className="w-5 h-5 text-orange-400" /></div>
            <h3 className="font-semibold text-foreground text-lg">Rekordy okresu</h3>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Najdłuższa passa</dt>
                <dd className="text-xl font-bold tabular-nums">
                  {summary?.streaks.longestInPeriod.length ?? 0} {plural(summary?.streaks.longestInPeriod.length ?? 0, "dzień", "dni", "dni")}
                </dd>
                {summary?.streaks.longestInPeriod.from && summary.streaks.longestInPeriod.length > 1 && (
                  <dd className="text-xs text-muted-foreground">
                    {formatDayLong(summary.streaks.longestInPeriod.from)} – {formatDayLong(summary.streaks.longestInPeriod.to!)}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-muted-foreground">Najbardziej muzyczny dzień</dt>
                <dd className="text-xl font-bold">{summary?.busiestDay ? formatDayLong(summary.busiestDay.date) : "–"}</dd>
                {summary?.busiestDay && (
                  <dd className="text-xs text-muted-foreground">
                    {summary.busiestDay.plays} {plural(summary.busiestDay.plays, "odtworzenie", "odtworzenia", "odtworzeń")} · {formatMinutes(summary.busiestDay.minutes)}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-muted-foreground">Różne utwory</dt>
                <dd className="text-xl font-bold tabular-nums">{(totals?.uniqueTracks ?? 0).toLocaleString("pl-PL")}</dd>
              </div>
            </dl>
          )}
        </div>

        <ListenerProfile profile={summary?.profile} plays={totals?.plays ?? 0} isLoading={isLoading} />
      </section>

      {/* Calendar */}
      <section className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <ListeningCalendar />
      </section>

      <p className="text-xs text-muted-foreground">
        Dane pochodzą z historii zapisywanej przez SpotiStats (synchronizacja co godzinę) i z importu danych ze Spotify.
        Czas odtworzeń z API to pełna długość utworu – przewinięte utwory liczą się w całości.
      </p>
    </div>
  );
};

export default Summary;
