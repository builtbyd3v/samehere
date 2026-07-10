import Link from "next/link";

const pill = "rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97]";

export default function CommunityTabs({ tab }: { tab: "clubs" | "threads" }) {
  return (
    <div
      className="mt-4 inline-flex gap-0.5 rounded-full border border-[var(--border)] p-0.5"
      role="tablist"
      aria-label="Community"
    >
      <Link
        href="/community"
        role="tab"
        aria-selected={tab === "clubs"}
        className={
          tab === "clubs"
            ? `${pill} bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)]`
            : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
        }
      >
        Clubs
      </Link>
      <Link
        href="/community?tab=threads"
        role="tab"
        aria-selected={tab === "threads"}
        className={
          tab === "threads"
            ? `${pill} bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)]`
            : `${pill} text-[var(--ink-muted)] hover:text-[var(--ink)]`
        }
      >
        Threads
      </Link>
    </div>
  );
}
