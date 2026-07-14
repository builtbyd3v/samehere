"use client";

import { useState } from "react";
import Select, { type SelectOption } from "@/components/ui/Select";

export type DateRangePickerProps = {
  currentYear: number;
  defaultStart?: string | null;
  defaultEnd?: string | null;
  defaultIsCurrent?: boolean;
};

const label = "block text-sm font-medium text-[var(--ink)]";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_OPTIONS: SelectOption[] = [
  { value: "", label: "Month" },
  ...MONTH_LABELS.map((monthLabel, i) => ({ value: String(i + 1), label: monthLabel })),
];

function buildYearOptions(currentYear: number): SelectOption[] {
  const options: SelectOption[] = [{ value: "", label: "Year" }];
  for (let year = currentYear + 6; year >= currentYear - 10; year--) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
}

// Parse "yyyy-mm-dd" by splitting on "-" instead of `new Date()`, since Date
// parsing of a bare date string shifts by the local timezone offset.
function parseIsoParts(iso: string | null | undefined): { month: string; year: string } {
  if (!iso) return { month: "", year: "" };
  const parts = iso.split("-");
  if (parts.length < 2) return { month: "", year: "" };
  return { year: parts[0], month: String(Number(parts[1])) };
}

// Month+year start/end picker shared by experience/education editors.
// "is_current" is an independent flag submitted via its own checkbox input;
// it no longer gates the end month/year selects, since a user can be
// currently enrolled/employed and still set an expected end date.
export default function DateRangePicker({ currentYear, defaultStart, defaultEnd, defaultIsCurrent }: DateRangePickerProps) {
  const start = parseIsoParts(defaultStart);
  const end = parseIsoParts(defaultEnd);
  const yearOptions = buildYearOptions(currentYear);

  const [current, setCurrent] = useState(defaultIsCurrent ?? false);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={label}>Start</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <Select options={MONTH_OPTIONS} name="start_month" defaultValue={start.month} ariaLabel="Start month" className="w-full" />
          <Select options={yearOptions} name="start_year" defaultValue={start.year} ariaLabel="Start year" className="w-full" />
        </div>
      </div>

      <div>
        <label className={label}>End</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <Select options={MONTH_OPTIONS} name="end_month" defaultValue={end.month} ariaLabel="End month" className="w-full" />
          <Select options={yearOptions} name="end_year" defaultValue={end.year} ariaLabel="End year" className="w-full" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
        <input type="checkbox" name="is_current" checked={current} onChange={(e) => setCurrent(e.target.checked)} />
        I currently work or study here
      </label>
    </div>
  );
}
