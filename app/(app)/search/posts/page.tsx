import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FeedTimeline from "@/components/feed/FeedTimeline";
import EmptyState from "@/components/ui/EmptyState";
import { tokensFor, searchPosts } from "@/lib/search";

// Full post results for a search query — the "Show more posts" target from /search.
// ponytail: flat cap, add pagination if a query ever matches more than this.
const MAX = 30;

export default async function SearchPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const posts = q ? await searchPosts(supabase, tokensFor(q), MAX) : [];
  const items = posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));

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
        </div>
      ) : (
        <EmptyState title="No posts found" description={`Nothing matched “${q}”.`} />
      )}
    </main>
  );
}
