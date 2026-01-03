import { type LucideIcon, Loader2 } from "lucide-react";
import { type ReactNode } from "react";
import TimeRangeFilter, { type TimeRange } from "@/components/TimeRangeFilter";

interface TopItemsLayoutProps {
    title: string;
    highlightedTitle: string;
    subtitle: string;
    timeRange: TimeRange;
    onTimeRangeChange: (value: TimeRange) => void;
    statsCards: ReactNode;
    gridTitle: string;
    gridSubtitle: string;
    gridIcon: LucideIcon;
    isLoading: boolean;
    isEmpty: boolean;
    children: ReactNode;
}

/**
 * TopItemsLayout - Shared layout for Top Artists and Top Tracks pages
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
        <div className="space-y-8">
            {/* Hero Section */}
            <section className="opacity-0 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-1">
                            {title} <span className="text-gradient">{highlightedTitle}</span>
                        </h1>
                        <p className="text-muted-foreground">{subtitle}</p>
                    </div>
                    <TimeRangeFilter value={timeRange} onChange={onTimeRangeChange} />
                </div>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statsCards}
            </section>

            {/* Items Grid */}
            <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

                {/* Header */}
                <div className="relative flex items-center gap-3 mb-5">
                    <div className="icon-container">
                        <GridIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">{gridTitle}</h2>
                        <p className="text-sm text-muted-foreground">{gridSubtitle}</p>
                    </div>
                </div>

                {/* Grid content */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-2">
                    {isLoading ? (
                        <div className="col-span-2 flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : isEmpty ? (
                        <div className="col-span-2 text-center py-12">
                            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                <GridIcon className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                            <p className="text-muted-foreground">Brak danych</p>
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </section>
        </div>
    );
};

export default TopItemsLayout;
