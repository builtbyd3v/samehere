import Link from "next/link";
import { ghostCta, signupCta } from "./cta";

const FREE_FEATURES = [
  "Initial diagnosis and adaptive path",
  "Core path tasks and application tracking",
  "Opportunity browsing with fit guidance",
  "One focused next move at a time",
] as const;

const PRO_FEATURES = [
  "Re-diagnose when your situation changes",
  "Generate deeper project plans",
  "Write listing-specific pitches",
  "Practice role-specific interviews",
  "Use the stronger model with higher limits",
] as const;

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="m19.8 6.6-9.678 12.904-5.814-5.582 1.384-1.443 4.186 4.017L18.2 5.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="landing-pricing-features">
      {items.map((item) => (
        <li key={item}>
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="landing-pricing">
      <h2 className="landing-pricing-title">Choose your pace.</h2>

      <div className="landing-pricing-grid">
        <article className="landing-price-plan landing-xai-card-hover">
          <div className="landing-xai-card-content">
            <p className="landing-plan-kicker">Free</p>
            <h3>Start your path</h3>
            <p className="landing-plan-description">
              Diagnose the gap and make the next useful move.
            </p>
            <p className="landing-plan-price">
              $0<span>forever</span>
            </p>
            <div className="landing-pricing-rule" />
            <FeatureList items={FREE_FEATURES} />
            <div className="landing-plan-action">
              <Link
                href="/signup"
                className={`${signupCta} w-full justify-center`}
              >
                Join free
              </Link>
            </div>
          </div>
        </article>

        <article className="landing-price-plan landing-price-plan-pro landing-xai-card-hover">
          <div className="landing-xai-card-content">
            <p className="landing-plan-kicker">
              Pro{" "}
              <span className="inline-flex whitespace-nowrap rounded-full border border-[var(--accent-blue)] bg-[var(--accent-blue-soft)] px-2 py-1 text-[0.6875rem] font-medium text-[var(--accent-blue-strong)]">
                Most useful when it counts
              </span>
            </p>
            <h3>Move faster when it counts</h3>
            <p className="landing-plan-description">
              Add more depth when an application or interview matters now.
            </p>
            <p className="landing-plan-price">
              $4.99<span>/month · $12.99/semester</span>
            </p>
            <div className="landing-pricing-rule" />
            <FeatureList items={PRO_FEATURES} />
            <div className="landing-plan-action">
              <Link
                href="/pro"
                className={`${ghostCta} w-full justify-center`}
              >
                View Pro
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
