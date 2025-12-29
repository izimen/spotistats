import { Play, Loader2, Clock } from "lucide-react";
import { useState } from "react";

interface HistoryTrack {
    id: string;
    trackId: string;
    title: string;
    artist: string;
    image: string;
    playedAt: string;
    playedAtDate: Date;
    duration: string;
    durationMs: number;
}

interface HistoryListProps {
    tracks: HistoryTrack[];
    isLoading: boolean;
}

const HistoryList = ({ tracks, isLoading }: HistoryListProps) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-4 mb-6">
                <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                        <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Ostatnio słuchane</h2>
                    <p className="text-sm text-muted-foreground">Twoja historia słuchania</p>
                </div>
            </div>

            <div className="relative space-y-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : tracks.length > 0 ? (
                    tracks.map((track, index) => (
                        <div
                            key={track.id}
                            className={`
                      group relative flex items-center gap-4 p-3 rounded-xl
                      bg-gradient-to-r from-transparent to-transparent
                      hover:from-secondary/50 hover:to-primary/5
                      border border-transparent hover:border-border/50
                      transition-all duration-300 cursor-pointer
                      opacity-0 animate-slide-up
                    `}
                            style={{ animationDelay: `${700 + index * 40}ms` }}
                            onMouseEnter={() => setHoveredId(track.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {/* Track number */}
                            <div className="w-8 flex-shrink-0 text-center">
                                <span className={`
                        text-sm font-semibold tabular-nums
                        ${index < 3 ? 'text-primary' : 'text-muted-foreground'}
                      `}>
                                    {index + 1}
                                </span>
                            </div>

                            {/* Album art */}
                            <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-primary/50 transition-all duration-300">
                                    <img
                                        src={track.image}
                                        alt={track.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>

                                {/* Play overlay */}
                                <div className={`
                        absolute inset-0 flex items-center justify-center
                        bg-background/70 backdrop-blur-sm rounded-lg
                        transition-all duration-300
                        ${hoveredId === track.id ? 'opacity-100' : 'opacity-0'}
                      `}>
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                        <Play className="w-3.5 h-3.5 text-primary-foreground fill-primary-foreground ml-0.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Track info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors duration-300">
                                    {track.title}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                            </div>

                            {/* Duration - fixed width for alignment */}
                            <div className="w-12 flex-shrink-0 text-right hidden sm:block">
                                <span className="text-sm text-muted-foreground tabular-nums">
                                    {track.duration}
                                </span>
                            </div>

                            {/* Time ago - fixed width for alignment */}
                            <div className="w-24 flex-shrink-0 text-right">
                                <span className="text-xs text-muted-foreground">
                                    {track.playedAt}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">Brak historii słuchania</p>
                )}
            </div>
        </div>
    );
};

export default HistoryList;
