"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";
import AdaptiveWorkbench from "./AdaptiveWorkbench";
import { ghostCta, signupCta } from "./cta";

const LINE_ONE = ["Your", "next", "move,"] as const;
const LINE_TWO = ["built", "for", "where", "you", "are."] as const;

function RevealWords({
  words,
  offset,
}: {
  words: readonly string[];
  offset: number;
}) {
  return words.map((word, index) => (
    <span key={word}>
      {index > 0 ? " " : null}
      <span
        className="landing-hero-word"
        style={{ "--word-index": offset + index } as CSSProperties}
      >
        {word}
      </span>
    </span>
  ));
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    function skipIntroWhenHidden() {
      const bounds = hero?.getBoundingClientRect();
      if (
        document.visibilityState === "hidden" ||
        !bounds ||
        bounds.top >= window.innerHeight - 40 ||
        bounds.bottom <= 40
      ) {
        hero?.classList.add("landing-hero-skip-intro");
      }
    }

    skipIntroWhenHidden();
    document.addEventListener("visibilitychange", skipIntroWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", skipIntroWhenHidden);
  }, []);

  return (
    <section ref={heroRef} className="landing-hero">
      <div className="landing-hero-copy">
        <div className="landing-hero-announcement">
          <Link href="#product" className="landing-announce">
            <span>Early access</span>
            samehere is rebuilding around your internship path
            <span aria-hidden>→</span>
          </Link>
        </div>

        <h1>
          <RevealWords words={LINE_ONE} offset={0} />
          <br />
          <RevealWords words={LINE_TWO} offset={LINE_ONE.length} />
        </h1>

        <p className="landing-hero-subhead">
          Tell samehere where you&apos;re stuck. Get a focused path for building
          experience, applying with intent, or preparing for the interview.
        </p>

        <div className="landing-hero-actions">
          <div className="landing-hero-action landing-hero-action-primary">
            <Link href="/signup" className={signupCta}>
              Join free
            </Link>
          </div>
          <div className="landing-hero-action landing-hero-action-secondary">
            <Link href="#product" className={ghostCta}>
              See the path
            </Link>
          </div>
        </div>
      </div>

      <div className="landing-hero-workbench">
        <AdaptiveWorkbench />
      </div>
    </section>
  );
}
