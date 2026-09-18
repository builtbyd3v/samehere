import Link from "next/link";
import FeedTimeline from "@/components/feed/FeedTimeline";
import type { FeedPost } from "@/components/feed/PostCard";

export default function FollowingSeed({
  posts,
  viewerId,
}: {
  posts: FeedPost[];
  viewerId: string | null;
}) {
  const items = posts.map((post) => ({ kind: "post" as const, created_at: post.created_at, post }));

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <p className="font-medium text-[var(--ink)]">Follow people to shape this feed</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Recent labeled posts from the network until you follow 5 people.
        </p>
        <Link href="/search" className="btn-primary mt-3 inline-flex">
          Find people
        </Link>
      </div>
      {items.length > 0 ? <FeedTimeline items={items} viewerId={viewerId} /> : null}
    </div>
  );
}
