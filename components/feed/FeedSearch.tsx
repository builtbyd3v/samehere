import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import {
  SEARCH_PAGE,
  clampSearchOffset,
  nextSearchOffset,
  parseSearchPage,
  searchHref,
  searchPageOffset,
  searchPeople,
} from "@/lib/search";

export async function FeedSearchResults({
  q,
  page = 1,
  offset,
  projectPage = 1,
}: {
  q: string;
  page?: number;
  offset?: number;
  projectPage?: number;
}) {
  if (!q) return null;

  const peoplePage = parseSearchPage(page);
  const off = clampSearchOffset(offset ?? searchPageOffset(peoplePage));
  const supabase = await createClient();
  const results = await searchPeople(supabase, q, SEARCH_PAGE, off);
  const hasMore = results.length === SEARCH_PAGE && nextSearchOffset(off) != null;
  const showPager = peoplePage > 1 || hasMore;

  if (results.length === 0) {
    return (
      <div>
        <div className="card mt-4 px-6 py-10 text-center">
          <p className="font-medium text-[var(--ink)]">
            {peoplePage > 1 ? "No more people for this query." : "No students found"}
          </p>
          {peoplePage === 1 && (
            <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
              Nothing matched &ldquo;{q}&rdquo;. Try a different name, username, or project.
            </p>
          )}
        </div>
        {peoplePage > 1 && (
          <div className="mt-3 text-sm">
            <Link href={searchHref({ q, peoplePage: peoplePage - 1, projectPage })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
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
        {results.map((p) => {
          const name = p.display_name ?? p.username;
          return (
            <li key={p.id}>
              <Link
                href={`/profile/${p.username}`}
                className="card card-hover flex items-center gap-2.5 px-3 py-2.5 active:scale-[0.99]"
              >
                <AvatarBase
                  src={p.avatar_url}
                  seed={p.username}
                  name={name}
                  className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
                  pro={p.is_pro}
                />
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-x-1.5 font-medium">
                    {name}
                    <UserBadges isPro={p.is_pro} isFounder={p.is_founder} isCampusFounder={p.is_campus_founder} isVerifiedStudent={p.verified_student} />
                  </p>
                  <p className="text-[var(--ink-muted)]">@{p.username}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {showPager && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          {peoplePage > 1 && (
            <Link href={searchHref({ q, peoplePage: peoplePage - 1, projectPage })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
              Previous
            </Link>
          )}
          {hasMore && (
            <Link href={searchHref({ q, peoplePage: peoplePage + 1, projectPage })} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
