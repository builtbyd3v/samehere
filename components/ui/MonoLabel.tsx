import type { ReactNode } from "react";

type MonoTag = "h2" | "h3" | "h4" | "p" | "span" | "div" | "dt";

/** Geist Mono uppercase metadata label. Write the text in sentence case; CSS uppercases it. */
export function MonoLabel({
  as: Tag = "span",
  size = "xs",
  className = "",
  children,
}: {
  as?: MonoTag;
  size?: "xs" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`font-mono font-medium uppercase tabular-nums tracking-[0.08em] text-[var(--faint)] ${size === "xs" ? "text-[11px]" : "text-xs"} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
