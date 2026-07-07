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
 * Staggered sibling reveal. Parent gates the group; each `RevealItem` child
 * rises in sequence. Use for lists (steps, claims) — a real list rhythm, not
 * the whole-section fade reflex.
 */
export function Stagger({
  children,
  className,
  step = 0.08,
  delay = 0,
  amount = 0.15,
}: Props & { step?: number; amount?: number }) {
  const reduce = useReducedMotion();
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : step,
        delayChildren: reduce ? 0 : delay,
      },
    },
  };
  return (
    <motion.div
      className={className}
      variants={container}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function RevealItem({ children, className }: Omit<Props, "delay">) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
