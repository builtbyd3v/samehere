import Link from "next/link";

const pill =
  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-[0.97]";

export default function FeedTabs({
  tab,
  basePath = "/feed",
}: {
  tab: "latest" | "following";
  basePath?: string;
}) {
  return (
    <div
      className="inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
      role="tablist"
      aria-label="Feed"
    >
      <Link
        href={basePath}
        role="tab"
        aria-selected={tab === "latest"}
        className={
          tab === "latest"
            ? `${pill} bg-[var(--blue-glow)] text-[var(--blue)]`
            : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
        }
      >
        Latest
      </Link>
      <Link
        href={`${basePath}?tab=following`}
        role="tab"
        aria-selected={tab === "following"}
        className={
          tab === "following"
            ? `${pill} bg-[var(--blue-glow)] text-[var(--blue)]`
            : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
        }
      >
        Following
      </Link>
    </div>
  );
}
