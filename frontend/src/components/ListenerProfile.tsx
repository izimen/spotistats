import type { CSSProperties } from "react";
import { Skeleton } from "@/components/Editorial";
import type { ListenerProfile as Profile } from "@/hooks/useInsights";

/**
 * Listener profile from real plays (replaces the old "Music DNA", which guessed
 * energy/danceability from listening hours - Spotify audio-features are gone for dev-mode apps).
 * Each metric shows its definition in plain text, not behind a tooltip.
 */
const METRICS: { key: keyof Profile; label: string; hint: string }[] = [
  { key: "variety", label: "Różnorodność", hint: "Ilu różnych artystów przypada na 100 odtworzeń" },
  { key: "repeat", label: "Powtórki", hint: "Odtworzenia utworów, które już leciały w tym okresie" },
  { key: "loyalty", label: "Wierność", hint: "Udział najczęściej słuchanego artysty" },
  { key: "discovery", label: "Odkrycia", hint: "Artyści, którzy pojawili się u Ciebie pierwszy raz" },
  { key: "night", label: "Nocą", hint: "Odtworzenia między 22:00 a 6:00" },
  { key: "weekend", label: "Weekend", hint: "Sobota i niedziela (równomiernie byłoby ok. 29%)" },
];

interface ListenerProfileProps {
  profile?: Profile;
  plays?: number;
  isLoading?: boolean;
  className?: string;
  style?: CSSProperties;
}

const ListenerProfile = ({ profile, plays = 0, isLoading, className = "", style }: ListenerProfileProps) => {
  return (
    <div className={className} style={style}>
      <p className="mb-6 text-muted-foreground">
        {plays > 0 ? `Na podstawie ${plays.toLocaleString("pl-PL")} odtworzeń` : "Jak słuchasz"}
      </p>

      {isLoading && !profile ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map(m => <Skeleton key={m.key} className="h-20 w-full" />)}
        </div>
      ) : plays === 0 ? (
        <p className="text-muted-foreground">Brak odtworzeń w tym okresie.</p>
      ) : (
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m, i) => {
            const value = profile?.[m.key] ?? 0;
            return (
              <li key={m.key} className="row-in" style={{ "--i": i } as CSSProperties}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="type-head text-[22px]">{m.label}</span>
                  <span className="type-figure text-[28px] text-primary">{value}%</span>
                </div>
                <div
                  className="mt-2 h-[3px] bg-border"
                  role="meter"
                  aria-label={m.label}
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-primary" style={{ width: `${value}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{m.hint}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ListenerProfile;
