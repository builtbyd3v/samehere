import Link from "next/link";
import { Check } from "lucide-react";
import { ghostCta, signupCta } from "./cta";

const FREE_FEATURES = [
  "Feed, comments, SameHere reactions, and DMs",
  "Optional Building / Learning / Stuck labels",
  "Manual portfolio projects and sharing",
  "Search people, projects, and posts",
  "Activity heatmap and saved posts",
] as const;

const PRO_FEATURES = [
  "Customize your portfolio look and section order",
  "30-day views and project link clicks",
  "Higher analysis allowance when analysis is available",
  "Pro badge on your profile",
] as const;

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="landing-pricing-features">
      {items.map((item) => (
        <li key={item}>
          <Check size={16} strokeWidth={1.75} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  return (
    <div className="landing-xai">
      <section id="pricing" className="landing-pricing">
        <h2 className="landing-pricing-title">Share your work. Make your portfolio your own.</h2>
        <div className="landing-pricing-band">
          <article className="landing-pricing-col">
            <p className="landing-plan-kicker">Free</p>
            <h3>Share work and find peers</h3>
            <p className="landing-plan-description">
              Posting, messaging, and a written portfolio stay available without a subscription.
            </p>
            <p className="landing-plan-price">
              $0<span>forever</span>
            </p>
            <FeatureList items={FREE_FEATURES} />
            <div className="landing-plan-action">
              <Link href="/signup" className={`${signupCta} w-full justify-center`}>
                Join free
              </Link>
            </div>
          </article>
          <article className="landing-pricing-col is-pro">
            <p className="landing-plan-kicker">
              Pro
              <span className="landing-plan-badge">Optional</span>
            </p>
            <h3>More room to present your work</h3>
            <p className="landing-plan-description">
              Customize your portfolio, see what gets attention, and turn more repositories into projects.
            </p>
            <p className="landing-plan-price">
              $4.99<span>/month · $12.99/semester</span>
            </p>
            <FeatureList items={PRO_FEATURES} />
            <div className="landing-plan-action">
              <Link href="/pro" className={`${ghostCta} w-full justify-center`}>
                View Pro
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
