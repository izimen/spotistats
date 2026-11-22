import { RefreshCw } from "lucide-react";
import { useListeningChart, useSyncListeningHistory } from "@/hooks/useSpotifyData";
import { Skeleton } from "@/components/Editorial";
import { plural } from "@/lib/period";

const ORDER = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
const SHORT: Record<string, string> = {
    "Poniedziałek": "Pn", "Poniedzialek": "Pn", "Wtorek": "Wt", "Środa": "Śr", "Sroda": "Śr",
    "Czwartek": "Cz", "Piątek": "Pt", "Piatek": "Pt", "Sobota": "Sb", "Niedziela": "Nd",
    "Pon": "Pn", "Czw": "Cz", "Sob": "Sb", "Ndz": "Nd",
};
const ON_DAY: Record<string, string> = {
    Pn: "w poniedziałek", Wt: "we wtorek", Śr: "w środę", Cz: "w czwartek", Pt: "w piątek", Sb: "w sobotę", Nd: "w niedzielę",
};
const FULL: Record<string, string> = {
    Pn: "poniedziałek", Wt: "wtorek", Śr: "środa", Cz: "czwartek", Pt: "piątek", Sb: "sobota", Nd: "niedziela",
};

/** Plays per weekday (last 7 days) as plain bars — no chart library needed. */
const WeekBars = () => {
    const { data, isLoading } = useListeningChart(7);
    const sync = useSyncListeningHistory();

    if (isLoading) return <Skeleton className="h-48 w-full" />;

    const counts = new Map((data?.days || []).map(d => [SHORT[d.day] || d.day, d.count]));
    const days = ORDER.map(d => ({ day: d, count: counts.get(d) ?? 0 }));
    const max = Math.max(1, ...days.map(d => d.count));
    const total = days.reduce((s, d) => s + d.count, 0);
    const best = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);

    return (
        <div>
            <p className="mb-6 text-muted-foreground">
                {total > 0 ? (
                    <>
                        <span className="type-figure text-foreground">{total}</span> {plural(total, "odtworzenie", "odtworzenia", "odtworzeń")} w ostatnim tygodniu,
                        najwięcej {ON_DAY[best.day]}.
                    </>
                ) : (
                    "W tym tygodniu nie zapisaliśmy jeszcze żadnych odtworzeń."
                )}
            </p>
            <ol className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3" aria-label="Odtworzenia według dnia tygodnia">
                {days.map(d => (
                    <li key={d.day} className="flex h-full flex-col justify-end gap-2">
                        <span className="text-center text-xs tabular-nums text-muted-foreground">{d.count || ""}</span>
                        <span
                            className={`block w-full ${d.day === best.day && d.count > 0 ? "bg-primary" : "bg-foreground/25"}`}
                            style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
                            aria-label={`${FULL[d.day]}: ${d.count}`}
                        />
                    </li>
                ))}
            </ol>
            <div className="mt-2 grid grid-cols-7 gap-2 border-t border-border pt-2 text-center text-xs text-muted-foreground sm:gap-3">
                {days.map(d => <span key={d.day}>{d.day}</span>)}
            </div>
            <button
                type="button"
                onClick={() => sync.mutate()}
                disabled={sync.isPending}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 disabled:opacity-60"
            >
                <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                {sync.isPending ? "Synchronizuję…" : "Synchronizuj teraz"}
            </button>
        </div>
    );
};

export default WeekBars;
