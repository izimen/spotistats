import { useMemo } from "react";
import { Skeleton } from "@/components/Editorial";
import { useListeningCalendar } from "@/hooks/useInsights";
import { formatDayLong, formatDayShort, plural, toLocalDateString } from "@/lib/period";

const MONTH_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const WEEKDAY_LABELS = ["Pn", "", "Śr", "", "Pt", "", ""];
// 0 = no plays, 1-4 = quartiles of active days
const LEVEL_CLASSES = ["bg-foreground/10", "bg-primary/30", "bg-primary/55", "bg-primary/80", "bg-primary"];

interface Cell {
  date: string;
  plays: number;
  level: number;
  future: boolean;
}

function quantiles(values: number[]) {
  if (values.length === 0) return [1, 1, 1];
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return [q(0.25), q(0.5), q(0.75)];
}

/**
 * GitHub-style calendar of the last 12 months + current / longest streak.
 */
const ListeningCalendar = () => {
  const { data, isLoading } = useListeningCalendar(365);

  const { weeks, monthLabels } = useMemo(() => {
    if (!data) return { weeks: [] as Cell[][], monthLabels: [] as { index: number; label: string }[] };
    const counts = new Map(data.days.map(d => [d.date, d.plays]));
    const [q1, q2, q3] = quantiles(data.days.map(d => d.plays));
    const levelOf = (plays: number) => (plays === 0 ? 0 : plays <= q1 ? 1 : plays <= q2 ? 2 : plays <= q3 ? 3 : 4);

    // start on the Monday on/before `from`
    const start = new Date(`${data.from}T00:00:00`);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const today = data.to;

    const result: Cell[][] = [];
    const labels: { index: number; label: string }[] = [];
    let lastMonth = -1;
    for (const d = new Date(start); toLocalDateString(d) <= today || result[result.length - 1]?.length !== 7;) {
      if (!result.length || result[result.length - 1].length === 7) {
        result.push([]);
        const month = d.getMonth();
        if (month !== lastMonth) {
          labels.push({ index: result.length - 1, label: MONTH_SHORT[month] });
          lastMonth = month;
        }
      }
      const date = toLocalDateString(d);
      const plays = counts.get(date) ?? 0;
      result[result.length - 1].push({ date, plays, level: levelOf(plays), future: date > today || date < data.from });
      d.setDate(d.getDate() + 1);
    }
    return { weeks: result, monthLabels: labels };
  }, [data]);

  const current = data?.streaks.current;
  const longest = data?.streaks.longest;

  return (
    <section className="rule min-w-0 pt-6" aria-labelledby="calendar-title">
      <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="calendar-title" className="type-head text-[26px] sm:text-[30px]">Kalendarz słuchania</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.activeDays} ${plural(data.activeDays, "dzień", "dni", "dni")} z muzyką w ostatnich 12 miesiącach` : "Ostatnie 12 miesięcy"}
          </p>
        </div>
        <dl className="flex gap-10">
          <div>
            <dt className="text-sm text-muted-foreground">Obecna passa</dt>
            <dd className="type-figure mt-1 text-[36px] text-primary">{current?.length ?? "–"}</dd>
          </div>
          <div title={longest?.from && longest.to ? `${formatDayLong(longest.from)} – ${formatDayLong(longest.to)}` : undefined}>
            <dt className="text-sm text-muted-foreground">Najdłuższa passa</dt>
            <dd className="type-figure mt-1 text-[36px]">{longest?.length ?? "–"}</dd>
          </div>
        </dl>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-[120px] w-full" />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex flex-col gap-1 min-w-max">
            {/* month labels */}
            <div className="flex gap-[3px] pl-7 h-4 relative">
              {weeks.map((_, i) => {
                const label = monthLabels.find(m => m.index === i);
                return (
                  <div key={i} className="w-[11px] text-[10px] text-muted-foreground overflow-visible whitespace-nowrap">
                    {label?.label ?? ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-[3px]">
              <div className="flex flex-col gap-[3px] w-6 text-[10px] text-muted-foreground">
                {WEEKDAY_LABELS.map((l, i) => <div key={i} className="h-[11px] leading-[11px]">{l}</div>)}
              </div>
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-[3px]">
                  {week.map(cell => (
                    <div
                      key={cell.date}
                      className={`w-[11px] h-[11px] rounded-[3px] ${cell.future ? "bg-transparent" : LEVEL_CLASSES[cell.level]}`}
                      title={cell.future ? undefined : `${formatDayShort(cell.date)}: ${cell.plays} ${plural(cell.plays, "odtworzenie", "odtworzenia", "odtworzeń")}`}
                      aria-hidden={cell.future}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground mt-2">
              mniej
              {LEVEL_CLASSES.map(c => <div key={c} className={`w-[11px] h-[11px] rounded-[3px] ${c}`} />)}
              więcej
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ListeningCalendar;
