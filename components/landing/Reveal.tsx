"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export default function Reveal({ children, className, delay = 0 }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Thin wrapper for a staggered list — pairs with `RevealItem`, which carries the
 * per-item delay. (Parent→child variant propagation is unreliable in this motion
 * build, so each item animates itself on scroll-in.)
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
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: reduce ? 0 : index * step, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
