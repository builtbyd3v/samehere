import Link from "next/link";
import { CONTEXT_LABEL_CHIP, CONTEXT_LABEL_COPY, type ContextLabel } from "@/lib/context-label";
import { FEED_FILTER_LABELS, feedPath } from "@/lib/feed-label";

const idle =
  "rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-muted)] transition hover:text-[var(--ink)]";

export default function FeedLabelChips({ active }: { active: ContextLabel | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by label">
      {FEED_FILTER_LABELS.map((key) => {
        const on = active === key;
        return (
          <Link
            key={key}
            href={on ? feedPath() : feedPath({ label: key })}
            aria-current={on ? "page" : undefined}
            className={on ? CONTEXT_LABEL_CHIP[key] : idle}
          >
            {CONTEXT_LABEL_COPY[key]}
          </Link>
        );
      })}
    </div>
  );
}
