import React, { useRef, useState, useEffect } from "react";
import { Play } from "lucide-react";

interface TopArtistCardProps {
  rank: number;
  name: string;
  image: string;
  delay?: number;
}

const TopArtistCard = React.memo(({ rank, name, image, delay = 0 }: TopArtistCardProps) => {
  const isTop3 = rank <= 3;

  // Marquee state for name
  const nameRef = useRef<HTMLHeadingElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const [nameNeedsMarquee, setNameNeedsMarquee] = useState(false);
  const [nameScrollDistance, setNameScrollDistance] = useState(0);

  useEffect(() => {
    if (nameRef.current && nameContainerRef.current) {
      const textWidth = nameRef.current.scrollWidth;
      const containerWidth = nameContainerRef.current.clientWidth;
      const overflow = textWidth - containerWidth;
      setNameNeedsMarquee(overflow > 0);
      if (overflow > 0) {
        setNameScrollDistance(overflow + 16);
      }
    }
  }, [name]);

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl p-4 cursor-pointer
        bg-gradient-to-r from-card via-card to-secondary/20
        border border-border/50 hover:border-primary/40
        hover:scale-[1.01]
        opacity-0 animate-slide-up
      `}
      style={{
        animationDelay: `${delay}ms`,
        contain: 'layout style paint'
      }}
    >
      <div className="relative flex items-center gap-4 min-h-[52px]">
        {/* Rank number */}
        <div className={`
          w-8 flex-shrink-0 text-center
          ${isTop3
            ? 'text-3xl font-black bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-transparent'
            : 'text-2xl font-bold text-muted-foreground/40'
          }
        `}>
          {rank}
        </div>

        {/* Artist image */}
        <div className="relative flex-shrink-0">
          <div className={`
            w-14 h-14 rounded-full overflow-hidden
            ring-2 group-hover:ring-primary/70
            ${isTop3 ? 'ring-primary/50' : 'ring-border'}
          `}>
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105"
              loading="lazy"
            />
          </div>

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-full opacity-0 group-hover:opacity-100">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>

        {/* Artist name with marquee */}
        <div ref={nameContainerRef} className="flex-1 min-w-0 overflow-hidden space-y-0.5">
          <h3
            ref={nameRef}
            className={`font-semibold text-foreground whitespace-nowrap group-hover:text-primary ${nameNeedsMarquee ? 'animate-marquee' : ''}`}
            style={nameNeedsMarquee ? {
              animationDuration: `${Math.max(4, name.length * 0.2)}s`,
              '--marquee-distance': `-${nameScrollDistance}px`
            } as React.CSSProperties : {}}
          >
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">Artysta</p>
        </div>
      </div>
    </div>
  );
});

TopArtistCard.displayName = 'TopArtistCard';

export default TopArtistCard;
