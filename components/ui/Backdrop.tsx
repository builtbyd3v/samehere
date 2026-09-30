// The landing hero light pool only. Absolutely positioned: the parent needs
// `relative` and `overflow-hidden` (or `overflow-x-clip`) so the wide pool never
// causes horizontal scroll on phones.

const DECOR = "pointer-events-none absolute select-none";

const POOL = {
  accent: "bg-[radial-gradient(50%_50%_at_50%_50%,rgba(79,159,232,0.22),rgba(79,159,232,0.06)_45%,transparent_70%)]",
  deep: "bg-[radial-gradient(45%_80%_at_22%_0%,rgba(47,109,176,0.4),transparent_70%)]",
} as const;

/** Soft blue light pool. Position and size it with `className` (e.g. `-top-[420px] left-1/2 h-[900px] w-[1400px] -translate-x-1/2`). */
export function LightPool({ tone = "accent", className = "" }: { tone?: keyof typeof POOL; className?: string }) {
  return <div aria-hidden className={`${DECOR} ${POOL[tone]} ${className}`.trim()} />;
}
