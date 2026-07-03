import { createClient } from "@/lib/supabase/server";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";

export default async function SavedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const { data: rows } = await supabase
    .from("bookmarks")
    .select(`created_at, post:posts(${POST_SELECT})`)
    .order("created_at", { ascending: false })
    .returns<{ created_at: string; post: FeedPost | null }[]>();

  // posts RLS re-checks visibility on the embed, so a post that became
  // invisible/deleted comes back null and is filtered out here.
  const posts = (rows ?? []).map((r) => r.post).filter((p): p is FeedPost => !!p);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em]">Saved</h1>

      <section>
        {posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            No saved posts yet. Bookmark posts to find them here.
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} viewerId={viewerId} />)
        )}
      </section>
    </main>
  );
}
