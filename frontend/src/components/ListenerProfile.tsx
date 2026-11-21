import { Info, UserRound } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListenerProfile as Profile } from "@/hooks/useInsights";

/**
 * Listener profile from real plays (replaces the old "Music DNA", which guessed
 * energy/danceability from listening hours - Spotify audio-features are gone for dev-mode apps).
 */
const METRICS: { key: keyof Profile; label: string; hint: string; color: string }[] = [
  { key: "variety", label: "Różnorodność", hint: "Ilu różnych artystów przypada na 100 odtworzeń.", color: "bg-primary" },
  { key: "repeat", label: "Powtórki", hint: "Jaka część odtworzeń to utwory, które już leciały w tym okresie.", color: "bg-purple-500" },
  { key: "loyalty", label: "Wierność", hint: "Udział Twojego najczęściej słuchanego artysty we wszystkich odtworzeniach.", color: "bg-pink-500" },
  { key: "discovery", label: "Odkrycia", hint: "Odtworzenia artystów, którzy w tym okresie pojawili się w Twojej historii po raz pierwszy.", color: "bg-amber-500" },
  { key: "night", label: "Nocą", hint: "Odtworzenia między 22:00 a 6:00.", color: "bg-indigo-500" },
  { key: "weekend", label: "Weekend", hint: "Odtworzenia w sobotę i niedzielę (równomierne słuchanie to ok. 29%).", color: "bg-orange-500" },
];

interface ListenerProfileProps {
  profile?: Profile;
  plays?: number;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ListenerProfile = ({ profile, plays = 0, isLoading, className = "", style }: ListenerProfileProps) => {
  return (
    <div
      className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 ${className}`}
      style={style}
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <UserRound className="w-6 h-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-lg">Profil słuchacza</h3>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" aria-label="Jak to liczymy" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Prawdziwe proporcje z Twojej historii odtworzeń w wybranym okresie (z bazy SpotiStats, nie z próbki). Najedź na nazwę, żeby zobaczyć definicję.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            {plays > 0 ? `Na podstawie ${plays.toLocaleString("pl-PL")} odtworzeń` : "Jak słuchasz"}
          </p>
        </div>
      </div>

      {isLoading && !profile ? (
        <div className="space-y-4">
          {METRICS.map(m => <Skeleton key={m.key} className="h-3 w-full rounded-full" />)}
        </div>
      ) : plays === 0 ? (
        <p className="text-sm text-muted-foreground">Brak odtworzeń w tym okresie.</p>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div className="space-y-4">
            {METRICS.map(m => {
              const value = profile?.[m.key] ?? 0;
              return (
                <div key={m.key} className="flex items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground w-28 font-medium cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-4">
                        {m.label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">{m.hint}</TooltipContent>
                  </Tooltip>
                  <div
                    className="flex-1 h-3 bg-secondary/30 rounded-full overflow-hidden"
                    role="meter"
                    aria-label={m.label}
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`h-full ${m.color} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground w-12 text-right tabular-nums">{value}%</span>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
};

export default ListenerProfile;
