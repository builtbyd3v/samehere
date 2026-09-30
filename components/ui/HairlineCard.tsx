import type { ReactNode } from "react";

type Radius = 16 | 20 | 24 | 28 | 32;
type CardTag = "div" | "article" | "section" | "li" | "aside";

// Concentric radii: inner = outer - 1px (the 1px gradient border).
const OUTER: Record<Radius, string> = {
  16: "rounded-2xl",
  20: "rounded-[20px]",
  24: "rounded-3xl",
  28: "rounded-[28px]",
  32: "rounded-[32px]",
};
const INNER: Record<Radius, string> = {
  16: "rounded-[15px]",
  20: "rounded-[19px]",
  24: "rounded-[23px]",
  28: "rounded-[27px]",
  32: "rounded-[31px]",
};

/**
 * Card with a 1px top-lit gradient border. `className` styles the outer
 * wrapper (size, position), `innerClassName` the surface (padding, layout).
 */
export function HairlineCard({
  as: Tag = "div",
  radius = 20,
  lift = false,
  className = "",
  innerClassName = "",
  children,
}: {
  as?: CardTag;
  radius?: Radius;
  lift?: boolean;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`block bg-[linear-gradient(180deg,var(--edge-top),var(--fill-1))] p-px ${OUTER[radius]} ${
        lift
          ? "transition-transform duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          : ""
      } ${className}`.trim()}
    >
      <div
        className={`h-full overflow-hidden bg-[color:var(--surface-2)] ${INNER[radius]} ${innerClassName}`.trim()}
      >
        {children}
      </div>
    </Tag>
  );
}
