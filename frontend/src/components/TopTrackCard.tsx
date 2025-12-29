import React, { useState, useRef, useEffect } from "react";
import { Play, Heart } from "lucide-react";

interface TopTrackCardProps {
  rank: number;
  title: string;
  artist: string;
  image: string;
  duration: string;
  delay?: number;
}

const TopTrackCard = React.memo(({ rank, title, artist, image, duration, delay = 0 }: TopTrackCardProps) => {
  const isTop3 = rank <= 3;
  const [isLiked, setIsLiked] = useState(false);

  // Marquee state for title
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const [titleNeedsMarquee, setTitleNeedsMarquee] = useState(false);
  const [titleScrollDistance, setTitleScrollDistance] = useState(0);

  // Marquee state for artist
  const artistRef = useRef<HTMLParagraphElement>(null);
  const artistContainerRef = useRef<HTMLDivElement>(null);
  const [artistNeedsMarquee, setArtistNeedsMarquee] = useState(false);
  const [artistScrollDistance, setArtistScrollDistance] = useState(0);

  useEffect(() => {
    // Check title overflow
    if (titleRef.current && titleContainerRef.current) {
      const textWidth = titleRef.current.scrollWidth;
      const containerWidth = titleContainerRef.current.clientWidth;
      const overflow = textWidth - containerWidth;
      setTitleNeedsMarquee(overflow > 0);
      if (overflow > 0) {
        setTitleScrollDistance(overflow + 16);
      }
    }

    // Check artist overflow
    if (artistRef.current && artistContainerRef.current) {
      const textWidth = artistRef.current.scrollWidth;
      const containerWidth = artistContainerRef.current.clientWidth;
      const overflow = textWidth - containerWidth;
      setArtistNeedsMarquee(overflow > 0);
      if (overflow > 0) {
        setArtistScrollDistance(overflow + 16);
      }
    }
  }, [title, artist]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl p-4 cursor-pointer
        bg-gradient-to-r from-card via-card to-secondary/20
        border border-border/50 hover:border-primary/40
        hover:scale-[1.01]
        opacity-0 animate-slide-up
        h-[64px]
      `}
      style={{
        animationDelay: `${delay}ms`,
        contain: 'layout style paint'
      }}
    >
      <div className="relative flex items-center gap-4">
        {/* Rank number */}
        <div className={`
          w-6 flex-shrink-0 text-center
          ${isTop3
            ? 'text-2xl font-black bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-transparent'
            : 'text-xl font-bold text-muted-foreground/40'
          }
        `}>
          {rank}
        </div>

        {/* Album art */}
        <div className="relative flex-shrink-0">
          <div className={`
            w-12 h-12 rounded-lg overflow-hidden
            ring-1 group-hover:ring-primary/70
            ${isTop3 ? 'ring-primary/40' : 'ring-border'}
          `}>
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105"
              loading="lazy"
            />
          </div>

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-lg opacity-0 group-hover:opacity-100">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Play className="w-3.5 h-3.5 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Title with marquee */}
          <div ref={titleContainerRef} className="overflow-hidden max-w-full">
            <h3
              ref={titleRef}
              className={`font-medium text-foreground whitespace-nowrap group-hover:text-primary ${titleNeedsMarquee ? 'animate-marquee' : ''}`}
              style={titleNeedsMarquee ? {
                animationDuration: `${Math.max(4, title.length * 0.2)}s`,
                '--marquee-distance': `-${titleScrollDistance}px`
              } as React.CSSProperties : {}}
            >
              {title}
            </h3>
          </div>

          {/* Artist with marquee */}
          <div ref={artistContainerRef} className="overflow-hidden max-w-full">
            <p
              ref={artistRef}
              className={`text-sm text-muted-foreground whitespace-nowrap ${artistNeedsMarquee ? 'animate-marquee' : ''}`}
              style={artistNeedsMarquee ? {
                animationDuration: `${Math.max(4, artist.length * 0.2)}s`,
                '--marquee-distance': `-${artistScrollDistance}px`
              } as React.CSSProperties : {}}
            >
              {artist}
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-sm text-muted-foreground tabular-nums">{duration}</span>
          <button
            onClick={handleLikeClick}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              transition-all duration-200 active:scale-90
              ${isLiked
                ? 'text-primary bg-primary/20 scale-110'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/10 hover:scale-110'
              }
            `}
          >
            <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-primary' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
});

TopTrackCard.displayName = 'TopTrackCard';

export default TopTrackCard;
