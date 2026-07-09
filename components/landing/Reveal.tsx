type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

// Entrance animation for landing sections. Pure CSS (`.fade-rise` in globals),
// so the content's resting opacity is 1 and it renders visible with no JS —
// crawlers and JS-disabled clients saw a blank page below the hero when this
// used motion's `whileInView`, which paints `opacity:0` into the SSR HTML and
// only clears it on hydration.
//
// ponytail: this trades scroll-triggered reveal for an on-load one — `whileInView`
// cannot exist without JS. Sections below the fold have finished animating by the
// time you scroll to them. Restore scroll-triggering only with a pattern that
// keeps the no-JS resting state visible (e.g. `animation-timeline: view()` behind
// an @supports, static everywhere else).
export default function Reveal({ children, className, delay = 0 }: Props) {
  return (
    <div
      className={`fade-rise ${className ?? ""}`}
      style={{ "--delay": `${delay}s`, "--y": "28px" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Thin wrapper for a staggered list — pairs with `RevealItem`, which carries the
 * per-item delay.
 */
export function Stagger({ children, className }: Omit<Props, "delay">) {
  return <div className={className}>{children}</div>;
}

export function RevealItem({
  children,
  className,
  index = 0,
  step = 0.08,
}: Omit<Props, "delay"> & { index?: number; step?: number }) {
  return (
    <div
      className={`fade-rise ${className ?? ""}`}
      style={{ "--delay": `${index * step}s`, "--y": "20px" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
