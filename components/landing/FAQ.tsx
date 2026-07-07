"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import { landingH2 } from "@/lib/landing/styles";

const FAQ_ITEMS = [
  ["Is samehere free?", "Yes. Free for every verified student. Core features are never gated."],
  ["Who can join?", "Anyone with a valid .edu email. We verify it before you get an account."],
  ["What makes samehere different?", "Built for students: verified .edu signup, a contribution heatmap on every profile, streaks and school leaderboards, AI that matches you with the right peers, and SameHere when a post sounds like your life."],
  ["Is my stuff private?", "You control it. Private accounts, a hideable school, and a heatmap visibility setting. Logged-out visitors see nothing."],
  ["What is Pro?", "Optional upgrades: unlimited AI on a stronger model, Improve-my-post and AI icebreakers, who viewed your profile, a custom accent color, an animated avatar, and a badge. $4.99/mo or $12.99/semester. Natural-language search and early access are coming soon."],
] as const;

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-[5.5rem] mx-auto max-w-3xl px-5 py-20">
      <Reveal>
        <h2 className={landingH2}>Questions.</h2>
      </Reveal>
      <Reveal className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]" delay={0.08}>
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
