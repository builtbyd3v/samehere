import { OPEN_TO_LABELS } from "@/lib/portfolio/labels";
import type { OpenToTag } from "@/types/portfolio";

const TAGS = new Set<string>(["collaborate", "study", "feedback"]);

export default function OpenToTags({ tags }: { tags: readonly string[] }) {
  const visible = tags.filter((tag): tag is OpenToTag => TAGS.has(tag));
  if (visible.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {visible.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--ink)]"
        >
          {OPEN_TO_LABELS[tag]}
        </li>
      ))}
    </ul>
  );
}
