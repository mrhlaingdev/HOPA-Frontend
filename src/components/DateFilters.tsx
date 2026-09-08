import { MONTH_NAMES, type DateFilter } from "@/lib/church-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateFiltersProps = {
  value: DateFilter;
  onChange: (value: DateFilter) => void;
  dates: string[];
};

export function DateFilters({ value, onChange, dates }: DateFiltersProps) {
  const years = Array.from(new Set(dates.map((date) => date.slice(0, 4)).filter(Boolean))).sort(
    (a, b) => b.localeCompare(a),
  );
  const availableYears = years.length ? years : [String(new Date().getUTCFullYear())];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.year} onValueChange={(year) => onChange({ ...value, year })}>
        <SelectTrigger className="field h-auto w-auto px-3 py-2 text-xs" aria-label="Select year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {availableYears.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.month} onValueChange={(month) => onChange({ ...value, month })}>
        <SelectTrigger className="field h-auto w-auto px-3 py-2 text-xs" aria-label="Select month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          {MONTH_NAMES.map((month, index) => (
            <SelectItem key={month} value={String(index + 1).padStart(2, "0")}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
