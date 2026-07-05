"use client";

import Reveal from "./Reveal";
import LandingComposerDemo from "./LandingComposerDemo";
import LandingFollowButton from "./LandingFollowButton";
import { DEMO_SUGGESTIONS } from "@/lib/landing/demo-data";
import { landingH2 } from "@/lib/landing/styles";

export default function AISection() {
  return (
    <section id="ai" className="scroll-mt-[5.5rem] mx-auto max-w-[1200px] px-5 py-20">
      <Reveal>
        <h2 className={`max-w-[18ch] text-balance ${landingH2}`}>AI that helps you connect.</h2>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--ink-muted)]">
          Composer nudges when you&apos;re stuck. Connection prompts on suggested follows, grounded in real profile overlap, not generic flattery.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Reveal delay={0.06}>
          <h3 className="text-sm font-medium">Post composer</h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Tap &ldquo;Need an idea?&rdquo; for the same flow as the feed.</p>
          <div className="mt-4">
            <LandingComposerDemo />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h3 className="text-sm font-medium">People to follow</h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Suggested on your Following tab, ranked by profile fit.</p>
          <div className="mt-4 space-y-2">
            {DEMO_SUGGESTIONS.map((s) => (
              <div
                key={s.username}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
              >
                <img
                  src={`https://picsum.photos/seed/${s.avatarSeed}/72/72`}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-1.5 text-[var(--ink-muted)]">@{s.username}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{s.prompt}</p>
                </div>
                <LandingFollowButton />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
