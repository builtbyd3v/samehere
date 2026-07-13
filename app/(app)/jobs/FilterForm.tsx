"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Select from "@/components/ui/Select";

// Jobs board filter card. Custom dropdowns (components/ui/Select) replace
// native <select>s; picking an option navigates immediately. Text inputs
// submit the GET form on Enter or the Search button. All state lives in the
// URL; the server does the filtering.

const CONTROL =
  "h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

export default function FilterForm({
  q,
  location,
  kind,
  category,
  sponsorship,
  sort,
  categories,
  sponsorships,
  anyFilter,
  maxQuery,
}: {
  q: string;
  location: string;
  kind: string;
  category: string;
  sponsorship: string;
  sort: string;
  categories: string[];
  sponsorships: string[];
  anyFilter: boolean;
  maxQuery: number;
}) {
  const router = useRouter();

  // Dropdown picks navigate immediately (page resets to 1); q/location come
  // from the current URL values so an unsubmitted text edit doesn't stick.
  function pick(param: "kind" | "category" | "sponsorship" | "sort", value: string) {
    const sp = new URLSearchParams();
    const next = { q, location, kind, category, sponsorship, sort, [param]: value };
    if (next.q) sp.set("q", next.q);
    if (next.location) sp.set("location", next.location);
    if (next.kind) sp.set("kind", next.kind);
    if (next.category) sp.set("category", next.category);
    if (next.sponsorship) sp.set("sponsorship", next.sponsorship);
    if (next.sort && next.sort !== "newest") sp.set("sort", next.sort);
    const s = sp.toString();
    router.push(s ? `/jobs?${s}` : "/jobs");
  }

  return (
    <form
      action="/jobs"
      className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-paper"
    >
      {/* Dropdown state rides along when the text form submits. */}
      {kind && <input type="hidden" name="kind" value={kind} />}
      {category && <input type="hidden" name="category" value={category} />}
      {sponsorship && <input type="hidden" name="sponsorship" value={sponsorship} />}
      {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}

      <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
        <div className="relative">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search org or title"
            maxLength={maxQuery}
            className={`${CONTROL} w-full pl-9`}
          />
        </div>
        <input
          type="text"
          name="location"
          defaultValue={location}
          placeholder="Location or Remote"
          maxLength={60}
          className={`${CONTROL} w-full`}
        />
        <button type="submit" className="btn-primary h-10 px-5">
          Search
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          ariaLabel="Kind"
          value={kind}
          onChange={(v) => pick("kind", v)}
          options={[
            { value: "", label: "All kinds" },
            { value: "internship", label: "Internship" },
            // new_grad returns once a new-grad ingest source exists (kind enum kept in DB)
          ]}
        />
        <Select
          ariaLabel="Category"
          value={category}
          onChange={(v) => pick("category", v)}
          options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          ariaLabel="Sponsorship"
          value={sponsorship}
          onChange={(v) => pick("sponsorship", v)}
          options={[{ value: "", label: "Any sponsorship" }, ...sponsorships.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          ariaLabel="Sort"
          value={sort}
          onChange={(v) => pick("sort", v)}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
          ]}
        />
      </div>
      {anyFilter && (
        <div className="mt-2 flex justify-end">
          <Link href="/jobs" className="text-xs text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
            Clear filters
          </Link>
        </div>
      )}
    </form>
  );
}
