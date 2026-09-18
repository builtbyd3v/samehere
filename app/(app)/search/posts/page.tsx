import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FeedTimeline from "@/components/feed/FeedTimeline";
import EmptyState from "@/components/ui/EmptyState";
import {
  SEARCH_PAGE,
  tokensFor,
  searchPosts,
  clampSearchOffset,
  nextSearchOffset,
  postsSearchHref,
} from "@/lib/search";

export default async function SearchPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const offset = clampSearchOffset(params.offset);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const posts = q && tokensFor(q).length ? await searchPosts(supabase, q, SEARCH_PAGE, offset) : [];
  const items = posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));
  const nextOffset = nextSearchOffset(offset);
  const hasMore = posts.length === SEARCH_PAGE && nextOffset != null;
  const prevOffset = clampSearchOffset(offset - SEARCH_PAGE);

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <Link href={q ? `/search?q=${encodeURIComponent(q)}` : "/search"} className="text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]">
        ← All results
      </Link>
      <h1 className="mt-2 mb-4 text-lg font-semibold text-[var(--ink)]">
        Posts matching &ldquo;{q}&rdquo;
      </h1>
      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <FeedTimeline items={items} viewerId={viewerId} />
          <div className="mt-1 flex flex-col gap-2">
            {hasMore && nextOffset != null && (
              <Link
                href={postsSearchHref(q, nextOffset)}
                className="block rounded-md border border-[var(--border)] py-2 text-center text-sm font-medium text-[var(--ink-muted)]"
              >
                Next page
              </Link>
            )}
            {offset > 0 && (
              <Link
                href={postsSearchHref(q, prevOffset)}
                className="block text-center text-sm text-[var(--ink-muted)] underline hover:text-[var(--ink)]"
              >
                Previous
              </Link>
            )}
          </div>
        </div>
      ) : offset > 0 ? (
        <div>
          <p className="text-sm text-[var(--ink-muted)]">No more posts for this query.</p>
          <Link href={postsSearchHref(q, prevOffset)} className="mt-3 inline-block text-sm text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
            Previous
          </Link>
        </div>
      ) : (
        <EmptyState
          title="No posts found"
          description={`Nothing matched “${q}”. Try another phrase, or browse Latest for Stuck posts.`}
          action={{ label: "Browse Latest", href: "/feed" }}
          secondaryAction={{ label: "Back to search", href: q ? `/search?q=${encodeURIComponent(q)}` : "/search" }}
        />
      )}
    </main>
  );
}
