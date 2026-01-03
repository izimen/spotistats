export type TimeRange = "week" | "month" | "year" | "all";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const timeRanges: { value: TimeRange; label: string; shortLabel: string }[] = [
  { value: "week", label: "Tydzień", shortLabel: "7d" },
  { value: "month", label: "Miesiąc", shortLabel: "30d" },
  { value: "year", label: "Rok", shortLabel: "1r" },
  { value: "all", label: "Wszystko", shortLabel: "∞" },
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
