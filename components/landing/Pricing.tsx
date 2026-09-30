import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

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

type Plan = {
  name: string;
  title: string;
  description: string;
  price: string;
  note: string;
  features: readonly string[];
  cta: { href: string; label: string; variant: "primary" | "secondary" };
};

const PLANS: readonly Plan[] = [
  {
    name: "Free",
    title: "Share work and find peers",
    description: "Posting, messaging, and a written portfolio stay available without a subscription.",
    price: "$0",
    note: "forever",
    features: FREE_FEATURES,
    cta: { href: "/signup", label: "Join free", variant: "primary" },
  },
  {
    name: "Pro (optional)",
    title: "More room to present your work",
    description: "Customize your portfolio, see what gets attention, and turn more repositories into projects.",
    price: "$4.99",
    note: "per month, or $12.99 per semester",
    features: PRO_FEATURES,
    cta: { href: "/pro", label: "View Pro", variant: "secondary" },
  },
];

export default function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="mx-auto w-full max-w-[1040px] px-4 py-14 md:px-8 md:py-20">
      <h1 id="pricing-title" className="text-balance text-center text-title font-semibold text-[var(--ink)]">
        Share your work. Make your portfolio your own.
      </h1>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <article key={plan.name} className="flex min-w-0 flex-col rounded-[20px] border border-[var(--border)] bg-[var(--surface-3)] p-6 md:p-8">
            <p className="text-small font-medium text-[var(--muted)]">{plan.name}</p>
            <h2 className="mt-2 text-balance text-section font-semibold text-[var(--ink)]">{plan.title}</h2>
            <p className="mt-2 text-pretty text-body text-[var(--muted)]">{plan.description}</p>
            <p className="mt-6 text-display font-semibold tabular-nums text-[var(--ink)]">{plan.price}</p>
            <p className="mt-1 text-small text-[var(--muted)]">{plan.note}</p>
            <ul className="mt-6 flex flex-col gap-3 text-body text-[var(--ink-2)]">
              {plan.features.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={16} strokeWidth={1.75} aria-hidden className="mt-1 shrink-0 text-[var(--muted)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Button href={plan.cta.href} variant={plan.cta.variant} size="lg" className="w-full">
                {plan.cta.label}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
