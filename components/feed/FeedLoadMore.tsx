"use client";

import { useState } from "react";
import PostCard, { type FeedPost, PAGE } from "./PostCard";
import { loadMorePosts } from "@/app/(app)/feed/actions";

// Appends older pages below the server-rendered first page. Holds its own
// cursor (created_at of the last row it has) and hides itself when a short
// page comes back.
export default function FeedLoadMore({
  cursor,
  hasMore,
  viewerId,
}: {
  cursor: string;
  hasMore: boolean;
  viewerId: string | null;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [next, setNext] = useState<string>(cursor);
  const [more, setMore] = useState(hasMore);
  const [loading, setLoading] = useState(false);

  async function onMore() {
    setLoading(true);
    const batch = await loadMorePosts(next);
    setLoading(false);
    setPosts((prev) => [...prev, ...batch]);
    setMore(batch.length === PAGE);
    if (batch.length) setNext(batch[batch.length - 1].created_at);
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewerId={viewerId} />
      ))}
      {more && (
        <button
          onClick={onMore}
          disabled={loading}
          className="mx-auto mt-3 block rounded-full border border-[var(--border-strong)] px-5 py-2 text-sm font-medium transition hover:bg-[var(--featured-surface)] active:opacity-80 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}
