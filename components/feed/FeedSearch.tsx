import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SearchPersonCard from "@/components/search/SearchPersonCard";
import {
  SEARCH_PAGE,
  clampSearchOffset,
  nextSearchOffset,
  parseSearchPage,
  searchHref,
  searchPageOffset,
  searchPeople,
} from "@/lib/search";
import { hasPeopleFilters, type DiscoveryFilters } from "@/lib/discovery";

export async function FeedSearchResults({
  q,
  page = 1,
  offset,
  projectPage = 1,
  filters,
}: {
  q: string;
  page?: number;
  offset?: number;
  projectPage?: number;
  filters: DiscoveryFilters;
}) {
  if (!q && !hasPeopleFilters(filters)) return null;

  const peoplePage = parseSearchPage(page);
  const off = clampSearchOffset(offset ?? searchPageOffset(peoplePage));
  const supabase = await createClient();
  const results = await searchPeople(supabase, q, SEARCH_PAGE, off, {
    openTo: filters.tag,
    year: filters.year,
    major: filters.major,
    studyMode: filters.mode,
  });
  const hasMore = results.length === SEARCH_PAGE && nextSearchOffset(off) != null;
  const showPager = peoplePage > 1 || hasMore;
  const hrefOpts = {
    q,
    projectPage,
    tag: filters.tag,
    year: filters.year,
    major: filters.major,
    mode: filters.mode,
    label: filters.label,
  };

  if (results.length === 0) {
    return (
      <div>
        <div className="card mt-4 px-6 py-10 text-center">
          <p className="font-medium text-[var(--ink)]">
            {peoplePage > 1 ? "No more people for this query." : "No students found"}
          </p>
          {peoplePage === 1 && (
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              {q
                ? <>Nothing matched &ldquo;{q}&rdquo;. Try a different name, username, or filter.</>
                : "Nobody matches these filters yet. Try another stage or tag."}
            </p>
          )}
        </div>
        {peoplePage > 1 && (
          <div className="mt-3 text-sm">
            <Link href={searchHref({ ...hrefOpts, peoplePage: peoplePage - 1 })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
              Previous
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <ul className="mt-4 flex flex-col gap-1.5">
        {results.map((p) => (
          <SearchPersonCard key={p.id} person={p} />
        ))}
      </ul>
      {showPager && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          {peoplePage > 1 && (
            <Link href={searchHref({ ...hrefOpts, peoplePage: peoplePage - 1 })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
              Previous
            </Link>
          )}
          {hasMore && (
            <Link href={searchHref({ ...hrefOpts, peoplePage: peoplePage + 1 })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
