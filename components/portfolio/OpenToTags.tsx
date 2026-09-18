import { OPEN_TO_LABELS } from "@/lib/portfolio/labels";
import type { OpenToTag } from "@/types/portfolio";

const TAGS = new Set<string>(["collaborate", "study", "feedback"]);

export default function OpenToTags({ tags }: { tags: readonly string[] }) {
  const visible = tags.filter((tag): tag is OpenToTag => TAGS.has(tag));
  if (visible.length === 0) return null;
  return (
    <p className="mt-3 text-[12px] font-medium tracking-[0.01em] text-[var(--ink-muted)]">
      {visible.map((tag) => OPEN_TO_LABELS[tag]).join(" · ")}
    </p>
  );
}
