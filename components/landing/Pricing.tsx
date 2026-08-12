import Link from "next/link";
import { ghostCta, signupCta } from "./cta";
import { PRICING, formatUsd } from "@/lib/pricing";

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  const { free, pro, ultra } = PRICING;

  return (
    <section id="pricing" className="landing-pricing">
      <h2 className="landing-pricing-title">Choose your pace.</h2>
      <p className="landing-pricing-lede mx-auto mt-3 max-w-xl text-center text-[var(--ink-muted)]">
        Mission stays free. Pro buys velocity. Ultra is for interview season.
      </p>

      <div className="landing-pricing-grid landing-pricing-grid-3">
        <article className="landing-price-plan landing-xai-card-hover">
          <div className="landing-xai-card-content landing-price-plan-body">
            <p className="landing-plan-kicker">{free.kicker}</p>
            <h3>{free.name}</h3>
            <p className="landing-plan-description">{free.tagline}</p>
            <p className="landing-plan-price">
              {formatUsd(free.monthly)}
              <span>forever</span>
            </p>
            <div className="landing-pricing-rule" />
            <FeatureList items={free.features} />
          </div>
          <div className="landing-plan-action">
            <Link href="/signup" className={`${signupCta} w-full justify-center`}>
              Join free
            </Link>
          </div>
        </article>

        <article className="landing-price-plan landing-price-plan-pro landing-xai-card-hover">
          <div className="landing-xai-card-content landing-price-plan-body">
            <p className="landing-plan-kicker">
              {pro.kicker}{" "}
              <span className="inline-flex whitespace-nowrap rounded-full border border-[var(--accent-blue)] bg-[var(--accent-blue-soft)] px-2 py-1 text-[0.6875rem] font-medium text-[var(--accent-blue-strong)]">
                Most students
              </span>
            </p>
            <h3>{pro.name}</h3>
            <p className="landing-plan-description">{pro.tagline}</p>
            <p className="landing-plan-price">
              {formatUsd(pro.monthly)}
              <span>
                /mo · {formatUsd(pro.yearly)}/year
              </span>
            </p>
            <div className="landing-pricing-rule" />
            <FeatureList items={pro.features} />
          </div>
          <div className="landing-plan-action">
            <Link href="/pro" className={`${ghostCta} w-full justify-center`}>
              View Pro
            </Link>
          </div>
        </article>

        <article className="landing-price-plan landing-price-plan-ultra landing-xai-card-hover">
          <div className="landing-xai-card-content landing-price-plan-body">
            <p className="landing-plan-kicker">{ultra.kicker}</p>
            <h3>{ultra.name}</h3>
            <p className="landing-plan-description">{ultra.tagline}</p>
            <p className="landing-plan-price">
              {formatUsd(ultra.monthly)}
              <span>
                /mo · {formatUsd(ultra.yearly)}/year
              </span>
            </p>
            <div className="landing-pricing-rule" />
            <FeatureList items={ultra.features} />
          </div>
          <div className="landing-plan-action">
            <Link href="/pro?plan=ultra" className={`${ghostCta} w-full justify-center`}>
              View Ultra
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
