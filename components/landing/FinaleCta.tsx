import Link from "next/link";
import SameHereBrand from "@/components/brand/SameHereBrand";
import { signupCta } from "./cta";

export default function FinaleCta() {
  return (
    <section className="landing-finale" aria-labelledby="finale-title">
      <div className="landing-finale-mark">
        <SameHereBrand mode="settled" />
      </div>
      <h2 id="finale-title">
        You&apos;re not the only one.
        <br />
        <span className="landing-finale-outline">same here.</span>
      </h2>
      <div className="landing-finale-actions">
        <Link href="/signup" className={signupCta}>
          Join free
        </Link>
      </div>
    </section>
  );
}
