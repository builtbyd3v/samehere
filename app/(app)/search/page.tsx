import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedSearchResults } from "@/components/feed/FeedSearch";
import PeopleSearch from "@/components/feed/PeopleSearch";
import FeedTimeline from "@/components/feed/FeedTimeline";
import ClubCard from "@/components/community/ClubCard";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/search/SearchBar";
import { isPro } from "@/lib/pro";
import { tokensFor, searchPosts, searchClubs } from "@/lib/search";

const POSTS_PREVIEW = 3;
const CLUBS_CAP = 6;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const smart = params.mode === "smart";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  if (!q) {
    return (
      <main className="page-enter mx-auto max-w-2xl px-4 py-8">
        <SearchBar />
        <EmptyState title="Search people, posts, and clubs" />
      </main>
    );
  }

  const tokens = tokensFor(q);
  const [{ data: profile }, posts, clubs] = await Promise.all([
    user ? supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single() : Promise.resolve({ data: null }),
    // Fetch one past the preview so we know whether to offer "Show more posts".
    searchPosts(supabase, tokens, POSTS_PREVIEW + 1),
    searchClubs(supabase, tokens, CLUBS_CAP),
  ]);
  const pro = isPro(profile ?? { is_pro: false, pro_until: null });

  const hasMorePosts = posts.length > POSTS_PREVIEW;
  const postItems = posts
    .slice(0, POSTS_PREVIEW)
    .map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-8">
      <SearchBar initialQuery={q} initialSmart={smart} />

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">People</h2>
        <PeopleSearch isPro={pro} initialQuery={q} initialSmart={smart} keyword={<FeedSearchResults q={q} />} />
      </section>

      {postItems.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Posts</h2>
          <div className="flex flex-col gap-3">
            <FeedTimeline items={postItems} viewerId={viewerId} />
          </div>
          {hasMorePosts && (
            <Link
              href={`/search/posts?q=${encodeURIComponent(q)}`}
              className="mt-3 block rounded-md border border-[var(--border)] py-2 text-center text-sm font-medium text-[var(--ink-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
            >
              Show more posts
            </Link>
          )}
        </section>
      )}

      {clubs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Clubs ({clubs.length})</h2>
          <div className="flex flex-col gap-2">
            {clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
