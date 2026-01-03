import { LucideIcon, Info } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  icon: LucideIcon;
  delay?: number;
  variant?: "default" | "primary" | "accent";
  tooltip?: string;
}

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  delay = 0,
  variant = "default",
  tooltip,
}: StatsCardProps) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      const overflow = textWidth - containerWidth;
      setNeedsMarquee(overflow > 0);
      if (overflow > 0) {
        setScrollDistance(overflow + 16);
      }
    }
  }, [value]);

  const variants = {
    default: {
      bg: "from-card via-card to-card",
      iconBg: "from-primary/15 to-primary/5",
      iconBorder: "border-primary/20",
      accent: "bg-muted-foreground/50",
      border: "border-border/40",
    },
    primary: {
      bg: "from-primary/[0.08] via-card to-card",
      iconBg: "from-primary/25 to-primary/10",
      iconBorder: "border-primary/30",
      accent: "bg-primary",
      border: "border-primary/30",
    },
    accent: {
      bg: "from-accent/50 via-card to-card",
      iconBg: "from-primary/20 to-primary/5",
      iconBorder: "border-primary/25",
      accent: "bg-primary/70",
      border: "border-border/40",
    },
  };

  const v = variants[variant];

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl p-5 h-[140px] cursor-pointer
        bg-gradient-to-br ${v.bg}
        border ${v.border}
        shadow-lg shadow-black/5
        opacity-0 animate-slide-up
        hover:shadow-xl hover:shadow-primary/5
        hover:border-primary/40
        transition-all duration-300 ease-out
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient border - glass edge effect */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
      </div>

      {/* Subtle shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />

      {/* Hover glow effect */}
      <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full blur-2xl bg-primary/0 group-hover:bg-primary/10 transition-all duration-500" />

      <div className="relative flex items-start justify-between gap-4 h-full">
        <div className="space-y-2.5 flex-1 min-w-0 overflow-hidden">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">
              {title}
            </p>
            {tooltip && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-help">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Value with marquee */}
          <div ref={containerRef} className="overflow-hidden max-w-full">
            <p
              ref={textRef}
              className={`text-2xl font-bold text-foreground tracking-tight whitespace-nowrap group-hover:text-gradient ${needsMarquee ? 'animate-marquee' : ''}`}
              style={needsMarquee ? {
                animationDuration: `${Math.max(4, value.length * 0.25)}s`,
                '--marquee-distance': `-${scrollDistance}px`
              } as React.CSSProperties : {}}
            >
              {value}
            </p>
          </div>

          {/* Subtitle with accent dot */}
          {subtitle && (
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${v.accent} flex-shrink-0`} />
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            </div>
          )}
        </div>

        {/* Icon container */}
        <div className={`
          w-11 h-11 rounded-xl flex-shrink-0
          bg-gradient-to-br ${v.iconBg}
          flex items-center justify-center
          border ${v.iconBorder}
          shadow-lg shadow-primary/5
          group-hover:scale-105 group-hover:shadow-primary/15
          transition-all duration-300
        `}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-300" />
    </div>
  );
};

export default StatsCard;
