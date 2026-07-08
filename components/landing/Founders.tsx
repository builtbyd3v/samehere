"use client";

import Link from "next/link";
import Reveal, { Stagger, RevealItem } from "./Reveal";
import { IconCrown, IconGradCap } from "@/components/icons";
import { landingH2 } from "@/lib/landing/styles";
import { signupCta } from "./cta";

// Previews how the badge sits next to YOUR name — a neutral placeholder, not a
// fabricated student (the brand never fakes real people).
function BadgePreview({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-1.5 pr-4">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--featured-surface)] text-[var(--ink-faint)]">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M5 19.5c0-3.6 3.2-5.5 7-5.5s7 1.9 7 5.5V21H5z" />
        </svg>
      </span>
      <span className="text-sm font-semibold text-[var(--ink)]">You</span>
      {children}
    </div>
  );
}

export default function Founders({ spotsLeft }: { spotsLeft?: number }) {
  return (
    <section id="founders" className="scroll-mt-[5.5rem] mx-auto max-w-[1200px] px-5 py-20">
      <Reveal>
        <h2 className={`text-balance ${landingH2}`}>Be a founder.</h2>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-[var(--ink-muted)]">
          Two permanent badges for the students who build samehere. Both are free, on any plan.
        </p>
      </Reveal>

      <Stagger className="mt-10 grid gap-4 md:grid-cols-2 md:items-stretch">
        {/* Founder — signup incentive */}
        <RevealItem index={0}>
          <div className="card-hover flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-paper sm:p-8">
            <BadgePreview>
              <IconCrown className="h-[18px] w-[18px] text-[var(--founder)]" />
            </BadgePreview>

            <h3 className="mt-5 text-xl font-semibold tracking-[-0.01em] text-[var(--ink)]">Founder</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--ink-muted)]">
              For the first 100 students on samehere. A permanent gold crown beside your name,
              everywhere you post. Once the 100 are claimed, the badge is closed for good.
            </p>

            {spotsLeft != null && spotsLeft > 0 ? (
              <p className="mt-5 text-sm">
                <span className="font-semibold text-[var(--founder)]">{spotsLeft}</span>
                <span className="text-[var(--ink-muted)]"> of 100 founding spots left</span>
              </p>
            ) : spotsLeft === 0 ? (
              <p className="mt-5 text-sm font-medium text-[var(--ink-muted)]">All 100 founding spots claimed.</p>
            ) : null}

            <div className="mt-4">
              <Link href="/signup" className={signupCta}>
                Claim your spot
              </Link>
            </div>
          </div>
        </RevealItem>

        {/* Campus Founder — referral program */}
        <RevealItem index={1}>
          <div className="card-hover flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-paper sm:p-8">
            <BadgePreview>
              <IconGradCap className="h-[18px] w-[18px] text-[var(--campus-founder)]" />
            </BadgePreview>

            <h3 className="mt-5 text-xl font-semibold tracking-[-0.01em] text-[var(--ink)]">Campus Founder</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
              Bring your school with you. Share your referral link, and when 100 students join from it,
              you earn a permanent green badge as your campus&apos;s founder.
            </p>

            {/* referral-program preview — mirrors the in-app share card */}
            <div className="mt-5 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink-muted)]">
                  samehere.dev/signup?ref=you
                </span>
                <span className="btn-ghost shrink-0 !rounded-full !px-3 !py-1 text-sm">Copy link</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--ink)]">Campus Founder</span>
                <span className="font-medium text-[var(--ink)]">0 / 100</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--featured-surface)]">
                <div className="h-full w-[4%] rounded-full bg-[var(--campus-founder)]" />
              </div>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">Every student who joins from your link counts toward 100.</p>
            </div>
          </div>
        </RevealItem>
      </Stagger>
    </section>
  );
}
