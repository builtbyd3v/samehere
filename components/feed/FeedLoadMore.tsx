"use client";

import { useEffect, useRef, useState } from "react";
import { type FeedPost, PAGE } from "./PostCard";
import FeedTimeline from "./FeedTimeline";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import type { FeedTimelineItem } from "@/lib/feed-timeline";
import { loadMorePosts } from "@/app/(app)/feed/actions";

// The action can return either the richer { items } shape (posts + quotes +
// reposts already merged, what /feed's loadMorePosts gives us) or the older
// { posts } shape (what /saved's loadMoreSaved still returns — it doesn't
// merge in reposts). Both are normalized to FeedTimelineItem[] below so
// /saved's existing action needs no changes.
type LoadMoreResult =
  | { items: FeedTimelineItem[]; nextCursor: string | null }
  | { posts: FeedPost[]; nextCursor: string | null };

function toItems(result: LoadMoreResult): FeedTimelineItem[] {
  if ("items" in result) return result.items;
  return result.posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));
}

// Appends older pages below the server-rendered first page. Holds its own
// cursor and hides itself when a short page comes back. `action` is
// pluggable so other lists (e.g. /saved, whose cursor is the bookmark's
// created_at, not the post's) can drive this with their own server action;
// /feed relies on the default, loadMorePosts, which merges posts/quotes/reposts
// itself so pagination doesn't silently drop quotes or reposts.
export default function FeedLoadMore({
  cursor,
  hasMore,
  viewerId,
  action = loadMorePosts,
  auto = false,
}: {
  cursor: string;
  hasMore: boolean;
  viewerId: string | null;
  action?: (cursor: string) => Promise<LoadMoreResult>;
  auto?: boolean;
}) {
  const [items, setItems] = useState<FeedTimelineItem[]>([]);
  const [next, setNext] = useState<string>(cursor);
  const [more, setMore] = useState(hasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auto) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && more && !loading) onMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, more, loading]);

  async function onMore() {
    setLoading(true);
    const result = await action(next);
    setLoading(false);
    const batch = toItems(result);
    setItems((prev) => [...prev, ...batch]);
    setMore(batch.length === PAGE);
    if (result.nextCursor) setNext(result.nextCursor);
  }

  return (
    <>
      <FeedTimeline items={items} viewerId={viewerId} />
      {more && (
        <>
          <div ref={sentinelRef} aria-hidden />
          {loading && (
            <div className="flex flex-col gap-3">
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          )}
          <button type="button" onClick={onMore} disabled={loading} className="btn-ghost mx-auto mt-3">
            {loading ? "Loading…" : "Load more"}
          </button>
        </>
      )}
    </>
  );
}
