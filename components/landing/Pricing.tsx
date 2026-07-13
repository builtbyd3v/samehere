"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { IconBolt } from "@/components/icons";
import { landingCard, landingH2 } from "@/lib/landing/styles";
import { signupCta } from "./cta";

const HEADLINE = ["Free", "for", "everyone."] as const;
const FREE_FEATURES = [
  "Optional .edu verification badge",
  "Profiles, feed, and reactions",
  "Follow, DMs, and private accounts",
  "Streaks, leaderboards, and your heatmap",
  "Search and saved posts",
  "AI matching and icebreakers, with daily free caps",
] as const;

const PRO_FEATURES: { label: string; icon?: "bolt" }[] = [
  { label: "150 natural-language people searches a day" },
  { label: "A stronger AI model, 150 uses a day" },
  { label: "Improve my post: AI rewrites your draft" },
  { label: "See who viewed your profile" },
  { label: "Profile themes, accent color, banner, and animated avatar" },
  { label: "Weekly “5 people to meet” email, with AI reasons" },
  { label: "Pro badge on your profile", icon: "bolt" },
];

const PRO_COMING_SOON: string[] = [];

const card = `flex h-full flex-col card-hover ${landingCard}`;

export default function Pricing() {
  const reduce = useReducedMotion();

  return (
    <section id="pricing" className="scroll-mt-[5.5rem] mx-auto max-w-[1200px] px-5 py-24">
      <h2 className={`text-balance ${landingH2}`}>
        {HEADLINE.map((w, i) => (
          <motion.span
            key={w}
            className="mr-[0.22em] inline-block"
            initial={reduce ? undefined : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
          >
            {i === HEADLINE.length - 1 ? (
              <span className="font-display italic text-[var(--blue)]">{w}</span>
            ) : (
              w
            )}
          </motion.span>
        ))}
      </h2>
      <motion.p
        className="mt-4 max-w-[48ch] text-pretty text-base leading-relaxed text-[var(--ink-muted)]"
        initial={reduce ? undefined : { opacity: 0, y: 16 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      >
        Posting, following, and private accounts are never paywalled. Pro is optional.
      </motion.p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 md:items-stretch">
        <motion.div
          className="h-full"
          initial={reduce ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={card}>
            <p className="text-sm text-[var(--ink-muted)]">Free</p>
            <p className="mt-2 text-[48px] font-semibold leading-none tracking-[-0.03em]">$0</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Always free to join</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-[var(--ink-muted)]">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-[var(--ink-faint)]">+</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/signup" className={signupCta}>
                Join free
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="h-full"
          initial={reduce ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div
            className={`${card} relative overflow-hidden border-[var(--blue)]/45 ring-1 ring-[var(--blue)]/25 [&>:not([aria-hidden])]:relative`}
          >
            {/* soft blue bloom — Pro reads as the premium material */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
              style={{ background: "var(--blue-glow)" }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <IconBolt className="h-4 w-4 text-[var(--blue)]" />
                Pro
              </span>
              <motion.span
                className="rounded-full bg-[var(--blue)] px-2.5 py-0.5 text-xs font-medium text-white"
                initial={reduce ? undefined : { opacity: 0, scale: 0.6 }}
                whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={reduce ? undefined : { type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
              >
                Most popular
              </motion.span>
            </div>
            <p className="mt-2 text-[48px] font-semibold leading-none tracking-[-0.03em]">$4.99<span className="text-lg font-normal text-[var(--ink-muted)]">/mo</span></p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">or $12.99/semester</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-[var(--ink-muted)]">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2">
                  <span className="text-[var(--ink-faint)]">+</span>
                  {f.icon === "bolt" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <IconBolt className="h-4 w-4 shrink-0 text-[var(--blue)]" />
                      {f.label}
                    </span>
                  ) : (
                    f.label
                  )}
                </li>
              ))}
            </ul>
            {PRO_COMING_SOON.length > 0 && (
              <p className="mt-4 text-xs text-[var(--ink-faint)]">
                Coming soon to Pro: {PRO_COMING_SOON.join(", ")}.
              </p>
            )}
            <div className="mt-8">
              <Link href="/pro" className={signupCta}>
                Go Pro
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
