"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/** Primary CTA with a subtle magnetic pull toward the cursor + a one-shot shine
 *  sweep on hover. Both disabled under reduced-motion. */
export default function MagneticCta({ href, className = "", children }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.3);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div style={reduce ? undefined : { x: sx, y: sy }} className="inline-block">
      <Link
        ref={ref}
        href={href}
        onMouseMove={onMove}
        onMouseLeave={reset}
        className={`group relative overflow-hidden ${className}`}
      >
        <span className="relative z-10">{children}</span>
        {!reduce && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
          />
        )}
      </Link>
    </motion.div>
  );
}
