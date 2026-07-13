"use client";

import Link from "next/link";
import HeroSearchDemo from "./HeroSearchDemo";
import { ghostCta, signupCta } from "./cta";

// Word-by-word headline reveal. "people." and "path." carry the Fraunces
// italic accent (both have descenders — their wrap spans reserve bottom padding).
const LINE_1 = [{ w: "Find", accent: false }, { w: "your", accent: false }, { w: "people.", accent: true }] as const;
const LINE_2 = [{ w: "Find", accent: false }, { w: "your", accent: false }, { w: "path.", accent: true }] as const;

function Word({ w, delay, accent = false, descender = false }: { w: string; delay: number; accent?: boolean; descender?: boolean }) {
  return (
    <span className={`word-wrap mr-[0.22em] align-top ${descender ? "pb-[0.12em]" : ""}`}>
      <span
        className={`word-slide inline-block will-change-transform ${accent ? "font-display italic text-[var(--blue)]" : ""}`}
        style={{ ["--delay" as string]: `${delay}s` }}
      >
        {w}
      </span>
    </span>
  );
}

export default function Hero() {
  return (
    <section className="hero-grain relative flex min-h-[100dvh] items-center overflow-hidden">
      {/* static ambient presence: one slow-breathing blue field centered behind
          the search bar, so the hero reads lit even before anything types */}
      <div aria-hidden className="hero-ambient pointer-events-none absolute" />

      <div className="relative z-10 mx-auto flex w-full max-w-[820px] flex-col items-center px-5 py-10 text-center">
        <h1 className="text-balance text-[38px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[52px] md:text-[60px] md:tracking-[-0.04em]">
          {LINE_1.map((item, i) => (
            <Word key={item.w} w={item.w} delay={0.1 + i * 0.07} accent={item.accent} descender={item.accent} />
          ))}
          <br className="hidden sm:block" />
          {LINE_2.map((item, i) => (
            <Word
              key={item.w}
              w={item.w}
              delay={0.1 + (LINE_1.length + i) * 0.07}
              accent={item.accent}
              descender={item.accent}
            />
          ))}
        </h1>

        <p
          className="cascade-up mt-5 max-w-[52ch] text-base leading-relaxed text-[var(--ink-muted)] md:text-lg"
          style={{ ["--delay" as string]: "0.42s" }}
        >
          One AI-native network for students. Post what&apos;s real, find who gets it, land what&apos;s next.
        </p>

        <div className="cascade-up mt-8 w-full" style={{ ["--delay" as string]: "0.55s" }}>
          <HeroSearchDemo />
        </div>

        <div
          className="cascade-up mt-10 flex flex-wrap items-center justify-center gap-3"
          style={{ ["--delay" as string]: "0.7s" }}
        >
          <Link href="/signup" className={signupCta}>
            Join free
          </Link>
          <Link href="/login" className={ghostCta}>
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
