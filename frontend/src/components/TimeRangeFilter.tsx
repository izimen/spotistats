import { Calendar } from "lucide-react";

type TimeRange = "week" | "month" | "year" | "all";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "week", label: "Tydzień" },
  { value: "month", label: "Miesiąc" },
  { value: "year", label: "Rok" },
  { value: "all", label: "Wszystko" },
];

const TimeRangeFilter = ({ value, onChange }: TimeRangeFilterProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>Zakres:</span>
      </div>
      <div className="flex items-center bg-secondary/50 rounded-full p-1 border border-border/50">
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={`
              px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
              ${value === range.value
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }
            `}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeRangeFilter;
export type { TimeRange };
