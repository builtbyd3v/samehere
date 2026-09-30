import Link from "next/link";
import { OPEN_TO_LABELS } from "@/lib/portfolio/labels";
import type { OpenToTag } from "@/types/portfolio";

const TAGS = new Set<string>(["collaborate", "study", "feedback"]);

export default function OpenToTags({
  tags,
  username,
  linkToDm = false,
  className,
}: {
  tags: readonly string[];
  username?: string;
  /** Invitation to message. Blocks are enforced at get_or_create_dm. */
  linkToDm?: boolean;
  /** Replaces the default line class. */
  className?: string;
}) {
  const visible = tags.filter((tag): tag is OpenToTag => TAGS.has(tag));
  if (visible.length === 0) return null;
  const href = linkToDm && username ? `/messages?to=${encodeURIComponent(username)}` : null;
  const line = className ?? "mt-3 text-meta font-medium tracking-[0.01em] text-[var(--muted)]";
  if (!href) {
    return (
      <p className={line}>{visible.map((tag) => OPEN_TO_LABELS[tag]).join(" · ")}</p>
    );
  }
  return (
    <p className={line}>
      {visible.map((tag, i) => (
        <span key={tag}>
          {i > 0 ? " · " : null}
          <Link href={href} className="transition hover:text-[var(--ink)]">
            {OPEN_TO_LABELS[tag]}
          </Link>
        </span>
      ))}
    </p>
  );
}
