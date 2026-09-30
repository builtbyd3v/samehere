import type { ReactNode } from "react";

type LabelTag = "h2" | "h3" | "h4" | "p" | "span" | "div" | "dt";

/** Small sentence-case label for section headings and metadata keys. Geist, like everything else. */
export function SectionLabel({
  as: Tag = "span",
  size = "xs",
  className = "",
  children,
}: {
  as?: LabelTag;
  size?: "xs" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`font-medium tabular-nums text-[var(--muted)] ${size === "xs" ? "text-xs" : "text-small"} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
