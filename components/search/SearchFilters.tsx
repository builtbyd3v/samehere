import type { ReactNode } from "react";
import Link from "next/link";
import { CONTEXT_LABELS, OPEN_TO_TAGS, STUDY_MODES } from "@/lib/portfolio/validation";
import { OPEN_TO_LABELS, STUDY_MODE_LABELS } from "@/lib/portfolio/labels";
import { YEAR_OPTIONS, YEAR_VALUES } from "@/lib/education-options";
import { discoveryHref, toggleFilter, type DiscoveryFilters } from "@/lib/discovery";

const LABEL_COPY = { building: "Building", learning: "Learning", stuck: "Stuck" } as const;

const chip =
  "rounded-full border px-2.5 py-1 text-xs transition hover:border-[var(--border-strong)]";
const on = "border-[var(--ink)] text-[var(--ink)]";
const off = "border-[var(--border)] text-[var(--ink-muted)]";

export default function SearchFilters({
  q,
  filters,
  viewerMajor,
}: {
  q: string;
  filters: DiscoveryFilters;
  viewerMajor?: string | null;
}) {
  return (
    <div className="mt-4 space-y-3">
      <FilterRow label="Open to">
        {OPEN_TO_TAGS.map((tag) => (
          <Link key={tag} href={toggleFilter(filters, "tag", tag, q)} className={`${chip} ${filters.tag === tag ? on : off}`}>
            {OPEN_TO_LABELS[tag]}
          </Link>
        ))}
      </FilterRow>
      <FilterRow label="Year">
        {YEAR_VALUES.map((year) => (
          <Link
            key={year}
            href={toggleFilter(filters, "year", year, q)}
            className={`${chip} ${filters.year === year ? on : off}`}
          >
            {YEAR_OPTIONS.find((o) => o.value === year)?.label ?? year}
          </Link>
        ))}
      </FilterRow>
      <FilterRow label="Study mode">
        {STUDY_MODES.map((mode) => (
          <Link
            key={mode}
            href={toggleFilter(filters, "mode", mode, q)}
            className={`${chip} ${filters.mode === mode ? on : off}`}
          >
            {STUDY_MODE_LABELS[mode]}
          </Link>
        ))}
      </FilterRow>
      <FilterRow label="Post label">
        {CONTEXT_LABELS.map((label) => (
          <Link
            key={label}
            href={toggleFilter(filters, "label", label, q)}
            className={`${chip} ${filters.label === label ? on : off}`}
          >
            {LABEL_COPY[label]}
          </Link>
        ))}
      </FilterRow>
      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-[var(--ink-faint)] uppercase">Major</p>
        <div className="flex flex-wrap items-center gap-2">
          {viewerMajor && (
            <Link
              href={toggleFilter(filters, "major", viewerMajor, q)}
              className={`${chip} ${filters.major?.toLowerCase() === viewerMajor.toLowerCase() ? on : off}`}
            >
              {viewerMajor}
            </Link>
          )}
          <form action="/search" className="flex min-w-0 items-center gap-2">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {filters.tag ? <input type="hidden" name="tag" value={filters.tag} /> : null}
            {filters.year ? <input type="hidden" name="year" value={filters.year} /> : null}
            {filters.mode ? <input type="hidden" name="mode" value={filters.mode} /> : null}
            {filters.label ? <input type="hidden" name="label" value={filters.label} /> : null}
            <input
              name="major"
              defaultValue={filters.major ?? ""}
              placeholder="CS, SWE…"
              maxLength={80}
              className="input-base w-40 px-2.5 py-1 text-xs"
              aria-label="Filter by major"
            />
            <button type="submit" className="text-xs text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
              Apply
            </button>
            {filters.major && (
              <Link href={discoveryHref({ q, filters: { ...filters, major: null } })} className="text-xs text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
                Clear
              </Link>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium tracking-wide text-[var(--ink-faint)] uppercase">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
