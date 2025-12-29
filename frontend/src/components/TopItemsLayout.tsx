import { type LucideIcon, Loader2 } from "lucide-react";
import { type ReactNode } from "react";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";

interface TopItemsLayoutProps {
    // Hero section
    title: string;
    highlightedTitle: string;
    subtitle: string;

    // Time range
    timeRange: TimeRange;
    onTimeRangeChange: (value: TimeRange) => void;

    // Stats cards section (rendered externally for flexibility)
    statsCards: ReactNode;

    // Items grid
    gridTitle: string;
    gridSubtitle: string;
    gridIcon: LucideIcon;
    isLoading: boolean;
    isEmpty: boolean;
    children: ReactNode; // The actual items
}

/**
 * TopItemsLayout - Shared layout for Top Artists and Top Tracks pages
 * Provides consistent structure while allowing customization of stats and items
 */
const TopItemsLayout = ({
    title,
    highlightedTitle,
    subtitle,
    timeRange,
    onTimeRangeChange,
    statsCards,
    gridTitle,
    gridSubtitle,
    gridIcon: GridIcon,
    isLoading,
    isEmpty,
    children
}: TopItemsLayoutProps) => {
    return (
        <>
            {/* Hero Section */}
            <section className="mb-12 opacity-0 animate-fade-in">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
                                {title} <span className="text-primary">{highlightedTitle}</span>
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <TimeRangeFilter value={timeRange} onChange={onTimeRangeChange} />
                </div>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
                {statsCards}
            </section>

            {/* Items Grid */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/20 p-6">
                <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

                <div className="relative flex items-center gap-4 mb-6">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                            <GridIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">{gridTitle}</h2>
                        <p className="text-sm text-muted-foreground">{gridSubtitle}</p>
                    </div>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoading ? (
                        <div className="col-span-2 flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : isEmpty ? (
                        <p className="col-span-2 text-center text-muted-foreground py-8">Brak danych</p>
                    ) : (
                        children
                    )}
                </div>
            </div>
        </>
    );
};

export default TopItemsLayout;
