import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ListenerProfile from "@/components/ListenerProfile";
import ListeningCalendar from "@/components/ListeningCalendar";
import Segmented from "@/components/Segmented";
import { Section, ChartRow, EmptyNote, Skeleton, ListSkeleton } from "@/components/Editorial";
import { useUser } from "@/hooks/useSpotifyData";
import { usePeriodSummary, type RankedItem } from "@/hooks/useInsights";
import { isValidImageUrl } from "@/lib/utils";
import { exportHistoryCsv } from "@/lib/download";
import {
  type Period, type PeriodKind, formatDayLong, formatMinutes, isCurrentOrFuture, periodContaining,
  periodLabel, plural, previousPeriodLabel, shiftPeriod, toLocalDateString,
} from "@/lib/period";
import { canvasToBlob, drawShareCard, shareOrDownload } from "@/lib/shareCard";

function Change({ value, vs }: { value: number | null; vs: string }) {
  if (value === null) return <span className="text-sm text-muted-foreground">brak danych z okresu {vs}</span>;
  const up = value > 0;
  const color = value === 0 ? "text-muted-foreground" : up ? "text-primary" : "text-warn";
  return (
    <span className={`text-sm font-semibold ${color}`}>
      {up ? "+" : ""}{value}% <span className="font-normal text-muted-foreground">vs {vs}</span>
    </span>
  );
}

function Stat({ label, value, change, vs }: { label: string; value: string; change: number | null; vs: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="type-figure mt-2 text-[clamp(1.75rem,5vw,2.75rem)]">{value}</dd>
      <dd className="mt-1.5"><Change value={change} vs={vs} /></dd>
    </div>
  );
}

function Ranked({ items, round = false }: { items: RankedItem[]; round?: boolean }) {
  if (items.length === 0) return <EmptyNote title="Brak odtworzeń w tym okresie." />;
  return (
    <ol>
      {items.map((item, i) => (
        <ChartRow
          key={`${item.name}-${item.artist ?? ""}`}
          index={i}
          rank={i + 1}
          image={isValidImageUrl(item.image) ? item.image : null}
          round={round}
          title={item.name}
          subtitle={item.artist}
          value={
            <>
              <span className="block font-semibold text-foreground">{item.plays}</span>
              <span className="block text-xs">{formatMinutes(item.minutes)}</span>
            </>
          }
        />
      ))}
    </ol>
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
    if (next === kind) return;
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
    return parts.join(", ");
  }, [summary, totals]);

  const handleShare = async () => {
    if (!summary) return;
    setSharing(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      await drawShareCard(canvas, summary, title.charAt(0).toUpperCase() + title.slice(1), user?.displayName);
      const blob = await canvasToBlob(canvas);
      const result = await shareOrDownload(blob, `spotistats-${period.from.slice(0, period.kind === "year" ? 4 : 7)}.png`, `SpotiStats – ${title}`);
      if (result === "downloaded") toast.success("Zapisano obrazek z podsumowaniem");
    } catch {
      toast.error("Nie udało się zrobić obrazka. Spróbuj ponownie.");
    } finally {
      setSharing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    await exportHistoryCsv();
    setExporting(false);
  };

  const empty = !isLoading && totals?.plays === 0;
  const streak = summary?.streaks.longestInPeriod;

  return (
    <div className={`transition-opacity ${isFetching && summary ? "opacity-70" : ""}`}>
      {/* Period as the poster headline */}
      <header className="mb-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <Segmented
            label="Rodzaj okresu"
            value={kind}
            onChange={switchKind}
            options={[
              { value: "month", label: "Miesiąc" },
              { value: "year", label: "Rok" },
            ]}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPeriod(p => shiftPeriod(p, -1))}
              disabled={!canGoBack}
              className="touch-target flex items-center justify-center border border-border text-foreground hover:border-foreground disabled:opacity-30"
              aria-label="Poprzedni okres"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setPeriod(p => shiftPeriod(p, 1))}
              disabled={isCurrent}
              className="touch-target flex items-center justify-center border border-border text-foreground hover:border-foreground disabled:opacity-30"
              aria-label="Następny okres"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <h1 className="type-poster text-[clamp(3.5rem,13vw,9rem)] first-letter:uppercase" aria-live="polite">
          {title}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {isCurrent ? "Okres jeszcze trwa. " : ""}
          {empty
            ? "Brak odtworzeń w tym okresie. Zbieramy historię od pierwszego logowania; starszą możesz wgrać z eksportu danych Spotify."
            : heroLine ?? " "}
        </p>
      </header>

      {isError && !summary && (
        <p role="alert" className="mb-10 border-l-2 border-warn pl-4 text-foreground">
          Nie udało się pobrać podsumowania. Odśwież stronę za chwilę.
        </p>
      )}

      <div className="space-y-16">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            <Stat label="Minuty" value={(totals?.minutes ?? 0).toLocaleString("pl-PL")} change={summary?.change.minutes ?? null} vs={vs} />
            <Stat label="Odtworzenia" value={(totals?.plays ?? 0).toLocaleString("pl-PL")} change={summary?.change.plays ?? null} vs={vs} />
            <Stat label="Artyści" value={(totals?.uniqueArtists ?? 0).toLocaleString("pl-PL")} change={summary?.change.uniqueArtists ?? null} vs={vs} />
            <Stat label="Dni z muzyką" value={`${totals?.activeDays ?? 0}/${summary?.period.days ?? "–"}`} change={summary?.change.activeDays ?? null} vs={vs} />
          </dl>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={!summary || empty || sharing}
            className="touch-target bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-40"
          >
            {sharing ? "Robię plakat…" : "Udostępnij plakat"}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="touch-target border border-foreground/40 px-6 font-semibold text-foreground hover:border-foreground disabled:opacity-40"
            title="Cała historia z bazy SpotiStats (wszystkie okresy)"
          >
            {exporting ? "Pobieram…" : "Pobierz CSV"}
          </button>
        </div>

        <div className="grid gap-16 lg:grid-cols-2 lg:gap-14">
          <Section title="Top artyści" note="Odtworzenia i czas słuchania">
            {isLoading ? <ListSkeleton rows={6} /> : <Ranked items={summary?.topArtists ?? []} round />}
          </Section>
          <Section title="Top utwory" note="Odtworzenia i czas słuchania">
            {isLoading ? <ListSkeleton rows={6} /> : <Ranked items={summary?.topTracks ?? []} />}
          </Section>
        </div>

        <div className="grid gap-16 lg:grid-cols-2 lg:gap-14">
          <Section title="Odkrycia" note="Artyści po raz pierwszy w Twojej historii">
            {isLoading ? (
              <ListSkeleton rows={3} />
            ) : summary && summary.newArtists.count > 0 ? (
              <>
                <p className="type-figure mb-5 text-[40px]">
                  {summary.newArtists.count}{" "}
                  <span className="text-lg font-medium text-muted-foreground">{plural(summary.newArtists.count, "nowy artysta", "nowi artyści", "nowych artystów")}</span>
                </p>
                <ul className="divide-y divide-border border-y border-border">
                  {summary.newArtists.items.slice(0, 6).map(a => (
                    <li key={a.name} className="flex items-center justify-between gap-3 py-3">
                      <span className="truncate font-semibold">{a.name}</span>
                      <span className="shrink-0 tabular-nums text-sm text-muted-foreground">{a.plays} {plural(a.plays, "raz", "razy", "razy")}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyNote title="Nikogo nowego">Wszyscy artyści z tego okresu byli już wcześniej w Twojej historii.</EmptyNote>
            )}
          </Section>

          <Section title="Rekordy">
            {isLoading ? (
              <ListSkeleton rows={3} />
            ) : (
              <dl className="grid gap-8 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Najdłuższa passa</dt>
                  <dd className="type-figure mt-2 text-[32px]">
                    {streak?.length ?? 0} {plural(streak?.length ?? 0, "dzień", "dni", "dni")}
                  </dd>
                  {streak?.from && streak.length > 1 && (
                    <dd className="mt-1 text-sm text-muted-foreground">
                      {formatDayLong(streak.from)} – {formatDayLong(streak.to!)}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Najbardziej muzyczny dzień</dt>
                  <dd className="type-figure mt-2 text-[32px]">{summary?.busiestDay ? formatDayLong(summary.busiestDay.date) : "–"}</dd>
                  {summary?.busiestDay && (
                    <dd className="mt-1 text-sm text-muted-foreground">
                      {summary.busiestDay.plays} {plural(summary.busiestDay.plays, "odtworzenie", "odtworzenia", "odtworzeń")}, {formatMinutes(summary.busiestDay.minutes)}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Różne utwory</dt>
                  <dd className="type-figure mt-2 text-[32px]">{(totals?.uniqueTracks ?? 0).toLocaleString("pl-PL")}</dd>
                </div>
              </dl>
            )}
          </Section>
        </div>

        <Section title="Profil słuchacza" note="Jak słuchasz w tym okresie">
          <ListenerProfile profile={summary?.profile} plays={totals?.plays ?? 0} isLoading={isLoading} />
        </Section>

        <ListeningCalendar />

        <p className="rule pt-6 text-sm text-muted-foreground">
          Dane pochodzą z historii zapisywanej przez SpotiStats (synchronizacja co godzinę) i z importu danych ze Spotify.
          Czas odtworzeń z API liczymy do następnego utworu, więc przewinięte utwory liczą się krócej. Po dłuższej pauzie liczymy pełną długość utworu.
        </p>
      </div>
    </div>
  );
};

export default Summary;
