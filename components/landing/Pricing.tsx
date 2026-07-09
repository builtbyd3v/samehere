"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import Reveal from "./Reveal";
import { IconBolt } from "@/components/icons";
import { landingCard, landingH2 } from "@/lib/landing/styles";
import { signupCta } from "./cta";
const FREE_FEATURES = [
  "Verified .edu signup",
  "Profiles, feed, and reactions",
  "Follow, DMs, and private accounts",
  "Streaks, leaderboards, and your heatmap",
  "Search and saved posts",
  "AI matching with daily free caps",
] as const;

const PRO_FEATURES: { label: string; icon?: "bolt" }[] = [
  { label: "150 natural-language people searches a day" },
  { label: "A stronger AI model, 150 uses a day" },
  { label: "Improve my post and AI icebreakers" },
  { label: "See who viewed your profile" },
  { label: "Custom accent color, banner, and animated avatar" },
  { label: "Pro badge on your profile", icon: "bolt" },
];

const PRO_COMING_SOON = ["Weekly “3 people to meet”", "Profile themes"];

const card = `flex h-full flex-col ${landingCard}`;

export default function Pricing() {
  const reduce = useReducedMotion();

  return (
    <section id="pricing" className="scroll-mt-[5.5rem] mx-auto max-w-[1200px] px-5 py-20">
      <Reveal>
        <h2 className={`text-balance ${landingH2}`}>Free for every verified student.</h2>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--ink-muted)]">
          Posting, following, and private accounts are never paywalled. Pro is optional.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-2 md:items-stretch">
        <Reveal className="h-full">
          <motion.div
            className={card}
            whileHover={reduce ? undefined : { y: -2 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-sm text-[var(--ink-muted)]">Free</p>
            <p className="mt-2 text-[48px] font-semibold leading-none tracking-[-0.03em]">$0</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Always free for verified students</p>
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
                Join with .edu
              </Link>
            </div>
          </motion.div>
        </Reveal>

        <Reveal className="h-full" delay={0.08}>
          <motion.div
            className={`${card} relative overflow-hidden border-[var(--blue)]/45 ring-1 ring-[var(--blue)]/25 [&>:not([aria-hidden])]:relative`}
            whileHover={reduce ? undefined : { y: -2 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
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
              <span className="rounded-full bg-[var(--blue)] px-2.5 py-0.5 text-xs font-medium text-white">
                Most popular
              </span>
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
            <p className="mt-4 text-xs text-[var(--ink-faint)]">
              Coming soon to Pro: {PRO_COMING_SOON.join(", ")}.
            </p>
            <div className="mt-8">
              <Link href="/pro" className={signupCta}>
                Go Pro
              </Link>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
