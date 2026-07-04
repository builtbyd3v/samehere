import { createClient } from "@/lib/supabase/server";
import PostCard, { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";
import EmptyState from "@/components/ui/EmptyState";

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
  const rawPosts = (rows ?? []).map((r) => r.post).filter((p): p is FeedPost => !!p);
  const posts = await attachSignedMedia(supabase, rawPosts);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em]">Saved</h1>

      <section>
        {posts.length === 0 ? (
          <EmptyState
            title="No saved posts yet"
            description="Bookmark posts from the feed to find them here later."
            action={{ label: "Go to feed", href: "/feed" }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} viewerId={viewerId} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
