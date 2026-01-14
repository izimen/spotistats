import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, ExternalLink } from "lucide-react";

interface TopTrackCardProps {
  rank: number;
  title: string;
  artist: string;
  image: string;
  duration: string;
  delay?: number;
  previewUrl?: string | null;
  spotifyUrl?: string | null;
}

const TopTrackCard = React.memo(({
  rank,
  title,
  artist,
  image,
  duration,
  delay = 0,
  previewUrl,
  spotifyUrl
}: TopTrackCardProps) => {
  const isTop3 = rank <= 3;
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCTA, setShowCTA] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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

  // Audio playback progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setShowCTA(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      // Show CTA after 5 seconds of playing
      setTimeout(() => {
        if (audioRef.current && !audioRef.current.paused) {
          setShowCTA(true);
        }
      }, 5000);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

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

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If no preview available, go directly to Spotify
    if (!previewUrl) {
      if (spotifyUrl) {
        window.open(spotifyUrl, '_blank');
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Stop any other playing audio elements
      document.querySelectorAll('audio').forEach(a => {
        if (a !== audio) {
          a.pause();
          a.currentTime = 0;
        }
      });
      audio.play().catch(console.error);
    }
  };

  const handleSpotifyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spotifyUrl) {
      window.open(spotifyUrl, '_blank');
    }
  };

  // Rank badge colors
  const rankColors = {
    1: "from-yellow-400/20 to-yellow-500/10 text-yellow-400 border-yellow-400/30 shadow-yellow-400/20",
    2: "from-gray-300/20 to-gray-400/10 text-gray-300 border-gray-300/30 shadow-gray-300/20",
    3: "from-amber-600/20 to-amber-700/10 text-amber-500 border-amber-500/30 shadow-amber-500/20",
  };

  return (
    <div className="relative">
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
          ${isPlaying ? 'ring-2 ring-primary/50' : ''}
        `}
        style={{
          animationDelay: `${delay}ms`,
          transformStyle: 'preserve-3d',
          ...tiltStyle,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        {/* Hidden audio element */}
        {previewUrl && (
          <audio ref={audioRef} src={previewUrl} preload="none" />
        )}

        {/* Glass edge effect for top 3 */}
        {isTop3 && (
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        )}

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/[0.03] group-hover:to-transparent transition-all duration-300" />

        <div className="relative flex items-center gap-3 w-full">
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

            {/* Play/Pause overlay */}
            <div className={`
              absolute inset-0 flex items-center justify-center
              bg-black/60 backdrop-blur-sm rounded-lg
              transition-all duration-200
              ${isHovered || isPlaying ? 'opacity-100' : 'opacity-0'}
            `}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all
                ${isPlaying
                  ? 'bg-primary shadow-primary/40'
                  : 'bg-primary shadow-primary/40 scale-90 group-hover:scale-100'
                }
              `}>
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
                ) : (
                  <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground ml-0.5" />
                )}
              </div>
            </div>

            {/* Glow for top 3 */}
            {isTop3 && (
              <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0 space-y-0.5 pr-16" style={{ transform: 'translateZ(5px)' }}>
            <h3
              ref={titleRef}
              className="font-semibold text-foreground truncate group-hover:text-primary transition-colors"
            >
              {title}
            </h3>
            <p
              ref={artistRef}
              className="text-sm text-muted-foreground truncate"
            >
              {artist}
            </p>
          </div>
        </div>

        {/* Duration - positioned at right edge of card */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums font-medium">
          {duration}
        </span>

        {/* Progress bar during playback */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30 overflow-hidden rounded-b-xl">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Spotify CTA - appears below card */}
      {showCTA && spotifyUrl && (
        <button
          onClick={handleSpotifyClick}
          className="
            mt-2 w-full py-2 px-4 rounded-lg
            bg-[#1DB954]/10 hover:bg-[#1DB954]/20
            border border-[#1DB954]/30 hover:border-[#1DB954]/50
            text-[#1DB954] text-sm font-medium
            flex items-center justify-center gap-2
            transition-all duration-200
            animate-fade-in
          "
        >
          <span>Podoba się? Słuchaj dalej</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

TopTrackCard.displayName = 'TopTrackCard';

export default TopTrackCard;
