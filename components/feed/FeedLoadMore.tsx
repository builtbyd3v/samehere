"use client";

import { useState } from "react";
import PostCard, { type FeedPost, PAGE } from "./PostCard";
import { loadMorePosts } from "@/app/(app)/feed/actions";

// Default action wraps /feed's loadMorePosts: its cursor IS the post's own
// created_at, so the next cursor is just the last returned post's
// created_at — reproduces the original hardcoded wiring exactly.
async function loadMoreFeedPosts(cursor: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const posts = await loadMorePosts(cursor);
  return { posts, nextCursor: posts.length ? posts[posts.length - 1].created_at : null };
}

// Appends older pages below the server-rendered first page. Holds its own
// cursor and hides itself when a short page comes back. `action` is
// pluggable so other lists (e.g. /saved, whose cursor is the bookmark's
// created_at, not the post's) can drive this with their own server action;
// /feed relies on the default, which is byte-identical to the old wiring.
export default function FeedLoadMore({
  cursor,
  hasMore,
  viewerId,
  action = loadMoreFeedPosts,
}: {
  cursor: string;
  hasMore: boolean;
  viewerId: string | null;
  action?: (cursor: string) => Promise<{ posts: FeedPost[]; nextCursor: string | null }>;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [next, setNext] = useState<string>(cursor);
  const [more, setMore] = useState(hasMore);
  const [loading, setLoading] = useState(false);

  async function onMore() {
    setLoading(true);
    const { posts: batch, nextCursor } = await action(next);
    setLoading(false);
    setPosts((prev) => [...prev, ...batch]);
    setMore(batch.length === PAGE);
    if (nextCursor) setNext(nextCursor);
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewerId={viewerId} />
      ))}
      {more && (
        <button type="button" onClick={onMore} disabled={loading} className="btn-ghost mx-auto mt-3">
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}
