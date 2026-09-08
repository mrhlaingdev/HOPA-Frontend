import { ALL_DATE_FILTER, MONTH_NAMES, type DateFilter } from "@/lib/church-store";
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
  const safeValue = value ?? ALL_DATE_FILTER;
  const safeDates = Array.isArray(dates) ? dates : [];
  const years = Array.from(
    new Set(
      safeDates
        .filter((date) => typeof date === "string")
        .map((date) => date.slice(0, 4))
        .filter(Boolean),
    ),
  ).sort((a, b) => b.localeCompare(a));
  const selectedYear =
    safeValue.year === "all" || years.includes(safeValue.year) ? safeValue.year : "all";
  const selectedMonth = MONTH_NAMES[safeValue.month ? Number(safeValue.month) - 1 : -1]
    ? String(Number(safeValue.month)).padStart(2, "0") === safeValue.month
      ? safeValue.month
      : "all"
    : "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedYear} onValueChange={(year) => onChange({ ...safeValue, year })}>
        <SelectTrigger className="field h-auto w-auto px-3 py-2 text-xs" aria-label="Select year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {years.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedMonth} onValueChange={(month) => onChange({ ...safeValue, month })}>
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
