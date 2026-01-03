import React, { useState, useRef, useEffect, useCallback } from "react";
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
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState({});

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
    if (titleRef.current && titleContainerRef.current) {
      const textWidth = titleRef.current.scrollWidth;
      const containerWidth = titleContainerRef.current.clientWidth;
      const overflow = textWidth - containerWidth;
      setTitleNeedsMarquee(overflow > 0);
      if (overflow > 0) {
        setTitleScrollDistance(overflow + 16);
      }
    }

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

  // 3D Tilt effect for top 3 cards
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isTop3) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    setTiltStyle({
      transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`
    });
  }, [isTop3]);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    });
    setIsHovered(false);
  }, []);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  // Rank badge colors
  const rankColors = {
    1: "from-yellow-400/20 to-yellow-500/10 text-yellow-400 border-yellow-400/30 shadow-yellow-400/20",
    2: "from-gray-300/20 to-gray-400/10 text-gray-300 border-gray-300/30 shadow-gray-300/20",
    3: "from-amber-600/20 to-amber-700/10 text-amber-500 border-amber-500/30 shadow-amber-500/20",
  };

  return (
    <div
      ref={cardRef}
      className={`
        group relative overflow-hidden rounded-xl p-3 cursor-pointer
        bg-card/50 backdrop-blur-sm
        border border-border/30
        hover:bg-card hover:border-primary/30
        hover:shadow-lg hover:shadow-primary/5
        opacity-0 animate-slide-up
        transition-all duration-300
      `}
      style={{
        animationDelay: `${delay}ms`,
        transformStyle: 'preserve-3d',
        ...tiltStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glass edge effect for top 3 */}
      {isTop3 && (
        <div className="absolute inset-0 rounded-xl pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/[0.03] group-hover:to-transparent transition-all duration-300" />

      <div className="relative flex items-center gap-3">
        {/* Rank badge */}
        <div className={`
          w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
          font-bold text-sm
          ${isTop3
            ? `bg-gradient-to-br ${rankColors[rank as 1 | 2 | 3]} border shadow-lg`
            : 'bg-muted/50 text-muted-foreground/60 border border-border/30'
          }
          group-hover:scale-105 transition-transform duration-200
        `} style={{ transform: 'translateZ(15px)' }}>
          {rank}
        </div>

        {/* Album art with enhanced styling */}
        <div className="relative flex-shrink-0" style={{ transform: 'translateZ(10px)' }}>
          <div className={`
            w-12 h-12 rounded-lg overflow-hidden
            ring-1 ring-border/50 group-hover:ring-primary/40
            shadow-md group-hover:shadow-lg group-hover:shadow-primary/10
            transition-all duration-300
          `}>
            <img
              src={image}
              alt={title}
              className={`
                w-full h-full object-cover
                transition-transform duration-500
                ${isHovered ? 'scale-110' : 'scale-100'}
              `}
              loading="lazy"
            />
          </div>

          {/* Play overlay */}
          <div className={`
            absolute inset-0 flex items-center justify-center
            bg-black/60 backdrop-blur-sm rounded-lg
            transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>

          {/* Glow for top 3 */}
          {isTop3 && (
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0 space-y-0.5" style={{ transform: 'translateZ(5px)' }}>
          <div ref={titleContainerRef} className="overflow-hidden max-w-full">
            <h3
              ref={titleRef}
              className={`font-semibold text-foreground whitespace-nowrap group-hover:text-primary transition-colors ${titleNeedsMarquee && isHovered ? 'animate-marquee' : ''}`}
              style={titleNeedsMarquee ? {
                animationDuration: `${Math.max(4, title.length * 0.2)}s`,
                '--marquee-distance': `-${titleScrollDistance}px`
              } as React.CSSProperties : {}}
            >
              {title}
            </h3>
          </div>

          <div ref={artistContainerRef} className="overflow-hidden max-w-full">
            <p
              ref={artistRef}
              className={`text-sm text-muted-foreground whitespace-nowrap ${artistNeedsMarquee && isHovered ? 'animate-marquee' : ''}`}
              style={artistNeedsMarquee ? {
                animationDuration: `${Math.max(4, artist.length * 0.2)}s`,
                '--marquee-distance': `-${artistScrollDistance}px`
              } as React.CSSProperties : {}}
            >
              {artist}
            </p>
          </div>
        </div>

        {/* Duration & Like button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums font-medium opacity-70 group-hover:opacity-100 transition-opacity">
            {duration}
          </span>
          <button
            onClick={handleLikeClick}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              transition-all duration-200 active:scale-90
              ${isLiked
                ? 'text-primary bg-primary/15'
                : 'text-muted-foreground/50 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100'
              }
            `}
          >
            <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-primary scale-110' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
});

TopTrackCard.displayName = 'TopTrackCard';

export default TopTrackCard;
