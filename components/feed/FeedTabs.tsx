import Link from "next/link";

const pill =
  "rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97]";

export default function FeedTabs({ tab }: { tab: "latest" | "following" }) {
  return (
    <div
      className="inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
      role="tablist"
      aria-label="Feed"
    >
      <Link
        href="/feed"
        role="tab"
        aria-selected={tab === "latest"}
        className={
          tab === "latest"
            ? `${pill} bg-[var(--featured-surface)] text-[var(--ink)]`
            : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
        }
      >
        Latest
      </Link>
      <Link
        href="/feed?tab=following"
        role="tab"
        aria-selected={tab === "following"}
        className={
          tab === "following"
            ? `${pill} bg-[var(--featured-surface)] text-[var(--ink)]`
            : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
        }
      >
        Following
      </Link>
    </div>
  );
}
