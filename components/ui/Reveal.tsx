import type { ReactNode } from "react";
import { revealDelayClass } from "@/lib/ui/primitives";

type RevealTag = "div" | "section" | "header" | "article" | "aside" | "li" | "p" | "span";

/**
 * Fades and rises its content once on mount (`.rise-in` in app/globals.css,
 * 640ms). Server-safe, no JS. Off under prefers-reduced-motion. `delay` is in
 * ms and snaps to 40ms steps (max 480ms). Rare moments only: first load of a
 * page section, never feed items or daily actions.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
}: {
  as?: RevealTag;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`rise-in ${revealDelayClass(delay)} ${className}`.trim()}>{children}</Tag>;
}
