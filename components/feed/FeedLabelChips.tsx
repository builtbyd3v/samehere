import Link from "next/link";
import ContextLabelBadge from "@/components/ui/ContextLabelBadge";
import type { ContextLabel } from "@/lib/context-label";
import { FEED_FILTER_LABELS, feedPath } from "@/lib/feed-label";

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
            className={on ? undefined : "opacity-55 transition hover:opacity-100"}
          >
            <ContextLabelBadge label={key} />
          </Link>
        );
      })}
    </div>
  );
}
