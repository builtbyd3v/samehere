"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import { landingH2 } from "@/lib/landing/styles";

const FAQ_ITEMS = [
  ["Is samehere free?", "Yes. Free for every student. Core features are never gated."],
  ["Who can join?", "Anyone. Sign up with any email, then verify a .edu (now or later in settings) to get the verified student badge."],
  ["What makes samehere different?", "Built for students: an optional .edu verification badge, a contribution heatmap on every profile, streaks and leaderboards, clubs and a leaderboard, AI that matches you with the right peers, and SameHere when a post sounds like your life."],
  ["Is my data private?", "You control it. Private accounts, a hideable school, and a heatmap visibility setting. Logged-out visitors can open a public profile or a post you share, but private accounts stay hidden."],
  ["What is Pro?", "Optional upgrades: a stronger AI model with 150 uses a day, natural-language people search, Improve-my-post and AI icebreakers, who viewed your profile, a custom accent color, curated profile themes, a profile banner, an animated avatar, a weekly “people to meet” email with AI reasons, and a badge. $4.99/mo or $12.99/semester."],
] as const;

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-[5.5rem] mx-auto max-w-3xl px-5 py-20">
      <Reveal>
        <h2 className={landingH2}>Questions.</h2>
      </Reveal>
      <Reveal className="mt-8 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-6 shadow-paper sm:px-8" delay={0.08}>
        {FAQ_ITEMS.map(([q, a]) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {q}
              <span className="text-xl leading-none text-[var(--ink-faint)] transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-base leading-relaxed text-[var(--ink-muted)]">
              {a}
              {q === "What is Pro?" && (
                <>
                  {" "}
                  <Link href="/pricing" className="underline underline-offset-2">
                    See full pricing →
                  </Link>
                </>
              )}
            </p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}
