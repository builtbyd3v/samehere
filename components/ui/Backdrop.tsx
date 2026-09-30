// Decorative layers. Each is absolutely positioned: the parent needs
// `relative` and `overflow-hidden` (or `overflow-x-clip`) so wide pools never
// cause horizontal scroll on phones.

const DECOR = "pointer-events-none absolute select-none";

/** SVG fractal-noise grain (`.grain` in app/globals.css), blended over what is behind it. */
export function GrainOverlay({ strength = "subtle", className = "" }: { strength?: "subtle" | "strong"; className?: string }) {
  return (
    <div
      aria-hidden
      className={`grain ${DECOR} inset-0 mix-blend-overlay ${strength === "subtle" ? "opacity-[0.08]" : "opacity-[0.12]"} ${className}`.trim()}
    />
  );
}

/** 28px dot grid that fades out toward the bottom. */
export function DotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`${DECOR} inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_900px)] ${className}`.trim()}
    />
  );
}

const POOL = {
  accent: "bg-[radial-gradient(50%_50%_at_50%_50%,rgba(79,159,232,0.22),rgba(79,159,232,0.06)_45%,transparent_70%)]",
  deep: "bg-[radial-gradient(45%_80%_at_22%_0%,rgba(47,109,176,0.4),transparent_70%)]",
} as const;

/** Soft blue light pool. Position and size it with `className` (e.g. `-top-[420px] left-1/2 h-[900px] w-[1400px] -translate-x-1/2`). */
export function LightPool({ tone = "accent", className = "" }: { tone?: keyof typeof POOL; className?: string }) {
  return <div aria-hidden className={`${DECOR} ${POOL[tone]} ${className}`.trim()} />;
}
