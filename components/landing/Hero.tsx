"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";
import LandingAtmosphereLazy from "./LandingAtmosphereLazy";
import SocialSceneLazy from "./SocialSceneLazy";
import { ghostCta, signupCta } from "./cta";

const LINE_ONE = ["Find", "your"] as const;
const LINE_TWO = ["Show", "what", "you’re", "building."] as const;

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
      <LandingAtmosphereLazy />
      <div className="landing-hero-copy">
        <p className="landing-hero-announcement landing-announce">
          For students, building together
        </p>

        <h1>
          <RevealWords words={LINE_ONE} offset={0} />
          {" "}
          <span
            className="landing-hero-word landing-hero-people"
            style={{ "--word-index": LINE_ONE.length } as CSSProperties}
          >
            people
            <span className="landing-hero-underline" aria-hidden />
          </span>
          .
          <br />
          <RevealWords words={LINE_TWO} offset={LINE_ONE.length + 1} />
        </h1>

        <p className="landing-hero-subhead">
          A place for CS students to share the work, find a familiar struggle,
          and build a profile that feels like them.
        </p>

        <div className="landing-hero-actions">
          <div className="landing-hero-action landing-hero-action-primary">
            <Link href="/signup" prefetch className={signupCta}>
              Join free
            </Link>
          </div>
          <div className="landing-hero-action landing-hero-action-secondary">
            <Link href="#community" prefetch={false} className={ghostCta}>
              Explore the community
            </Link>
          </div>
        </div>
      </div>

      <div className="landing-hero-stage">
        <SocialSceneLazy />
      </div>
    </section>
  );
}
