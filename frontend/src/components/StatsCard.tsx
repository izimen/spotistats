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

const StatsCard = ({ title, value, subtitle, icon: Icon, delay = 0, variant = "default", tooltip }: StatsCardProps) => {
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
      // Calculate how much to scroll (add small padding)
      if (overflow > 0) {
        setScrollDistance(overflow + 16);
      }
    }
  }, [value]);

  const variants = {
    default: {
      bg: "from-card via-card to-secondary/30",
      iconBg: "from-primary/20 to-primary/5",
    },
    primary: {
      bg: "from-primary/20 via-primary/10 to-card",
      iconBg: "from-primary/30 to-primary/10",
    },
    accent: {
      bg: "from-accent via-card to-card",
      iconBg: "from-primary/25 to-primary/5",
    },
  };

  const v = variants[variant];

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl p-6 cursor-pointer
        bg-gradient-to-br ${v.bg}
        border border-border/50 hover:border-primary/40
        hover:scale-[1.02]
        opacity-0 animate-fade-in
        h-[140px]
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,_hsl(var(--foreground))_1px,_transparent_0)] bg-[size:24px_24px]" />

      <div className="relative flex items-start justify-between gap-3 h-full">
        <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
              {title}
            </p>
            {tooltip && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Value with marquee for long text */}
          <div ref={containerRef} className="overflow-hidden max-w-full">
            <p
              ref={textRef}
              className={`text-2xl font-bold text-foreground tracking-tight whitespace-nowrap ${needsMarquee ? 'animate-marquee' : ''
                }`}
              style={needsMarquee ? {
                animationDuration: `${Math.max(4, value.length * 0.25)}s`,
                '--marquee-distance': `-${scrollDistance}px`
              } as React.CSSProperties : {}}
            >
              {value}
            </p>
          </div>

          {subtitle && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            </div>
          )}
        </div>

        {/* Icon container - fixed size */}
        <div className={`
          w-12 h-12 rounded-2xl flex-shrink-0
          bg-gradient-to-br ${v.iconBg}
          flex items-center justify-center
          border border-primary/20 group-hover:border-primary/40
          group-hover:scale-110
        `}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
