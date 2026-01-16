export type TimeRange = "week" | "month" | "year";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

// Spotify API time ranges:
// short_term (~4 weeks), medium_term (~6 months), long_term (~1 year)
const timeRanges: { value: TimeRange; label: string; shortLabel: string }[] = [
  { value: "week", label: "4 Tygodnie", shortLabel: "4T" },
  { value: "month", label: "6 Miesięcy", shortLabel: "6M" },
  { value: "year", label: "1 Rok", shortLabel: "1R" },
];

const TimeRangeFilter = ({ value, onChange }: TimeRangeFilterProps) => {
  return (
    <div className="inline-flex items-center bg-muted/40 rounded-full p-1 border border-border/30 w-fit flex-shrink-0">
      {timeRanges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`
            px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
            transition-all duration-200
            ${value === range.value
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          {/* Desktop label */}
          <span className="hidden sm:inline">{range.label}</span>
          {/* Mobile label */}
          <span className="sm:hidden">{range.shortLabel}</span>
        </button>
      ))}
    </div>
  );
};

export default TimeRangeFilter;
