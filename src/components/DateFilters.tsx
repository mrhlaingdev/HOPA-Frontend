import { MONTH_NAMES, type DateFilter } from "@/lib/church-store";

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
      <select
        value={value.year}
        onChange={(event) => onChange({ ...value, year: event.target.value })}
        className="field px-3 py-2 text-xs"
        aria-label="Select year"
      >
        <option value="all">All Years</option>
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <select
        value={value.month}
        onChange={(event) => onChange({ ...value, month: event.target.value })}
        className="field px-3 py-2 text-xs"
        aria-label="Select month"
      >
        <option value="all">All Months</option>
        {MONTH_NAMES.map((month, index) => (
          <option key={month} value={String(index + 1).padStart(2, "0")}>
            {month}
          </option>
        ))}
      </select>
    </div>
  );
}
