import Segmented from "@/components/Segmented";

export type TimeRange = "week" | "month" | "year";

// Spotify API time ranges: short_term (~4 weeks), medium_term (~6 months), long_term (~1 year)
const options: { value: TimeRange; label: string; short: string }[] = [
  { value: "week", label: "4 tygodnie", short: "4 tyg." },
  { value: "month", label: "6 miesięcy", short: "6 mies." },
  { value: "year", label: "Rok", short: "Rok" },
];

export const timeRangeLabel = (range: TimeRange) =>
  options.find(o => o.value === range)?.label ?? "";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const TimeRangeFilter = ({ value, onChange }: TimeRangeFilterProps) => (
  <Segmented label="Okres" value={value} onChange={onChange} options={options} />
);

export default TimeRangeFilter;
