import { createClient } from "@/lib/supabase/server";
import PostComposer from "@/components/feed/PostComposer";
import PostCard, { type FeedPost } from "@/components/feed/PostCard";

const PAGE = 20;

// The whole feed. posts RLS already filters to what the viewer may see
// (public authors, own posts, or accepted-follow private authors), so a plain
// newest-first query is correct — no app-side privacy filtering.
export default async function FeedPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, content, created_at, user_id, author:profiles!posts_user_id_fkey(username, display_name, avatar_url, profile_school(school))"
    )
    .order("created_at", { ascending: false })
    .limit(PAGE)
    .returns<FeedPost[]>();

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em]">Feed</h1>

      <PostComposer />

      <section className="mt-6">
        {!posts || posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            No posts yet. Be the first to share something.
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
        {/* TODO(Step 3): cursor pagination + Load more */}
      </section>
    </main>
  );
}
