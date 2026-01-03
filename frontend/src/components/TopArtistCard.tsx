import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, User } from "lucide-react";

interface TopArtistCardProps {
  rank: number;
  name: string;
  image: string;
  delay?: number;
}

const TopArtistCard = React.memo(({ rank, name, image, delay = 0 }: TopArtistCardProps) => {
  const isTop3 = rank <= 3;
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState({});

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

        {/* Artist image - circular for artists */}
        <div className="relative flex-shrink-0" style={{ transform: 'translateZ(10px)' }}>
          <div className={`
            w-12 h-12 rounded-full overflow-hidden
            ring-2 ring-border/30 group-hover:ring-primary/40
            shadow-md group-hover:shadow-lg group-hover:shadow-primary/10
            transition-all duration-300
          `}>
            <img
              src={image}
              alt={name}
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
            bg-black/60 backdrop-blur-sm rounded-full
            transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground ml-0.5" />
            </div>
          </div>

          {/* Glow effect for top 3 */}
          {isTop3 && (
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Artist info */}
        <div ref={nameContainerRef} className="flex-1 min-w-0 overflow-hidden space-y-0.5" style={{ transform: 'translateZ(5px)' }}>
          <h3
            ref={nameRef}
            className={`font-semibold text-foreground whitespace-nowrap group-hover:text-primary transition-colors ${nameNeedsMarquee && isHovered ? 'animate-marquee' : ''}`}
            style={nameNeedsMarquee ? {
              animationDuration: `${Math.max(4, name.length * 0.2)}s`,
              '--marquee-distance': `-${nameScrollDistance}px`
            } as React.CSSProperties : {}}
          >
            {name}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="w-3 h-3" />
            <span>Artysta</span>
          </div>
        </div>
      </div>
    </div>
  );
});

TopArtistCard.displayName = 'TopArtistCard';

export default TopArtistCard;
