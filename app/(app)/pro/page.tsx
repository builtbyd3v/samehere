import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPro } from "@/lib/pro";
import { IconBolt } from "@/components/icons";
import { openBillingPortal, startCheckout } from "./actions";
import { PRICING, formatUsd } from "@/lib/pricing";

const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
const ULTRA_BILLING_READY = Boolean(
  process.env.STRIPE_PRICE_ULTRA_MONTHLY || process.env.STRIPE_PRICE_ULTRA_SEMESTER,
);

const NEVER_GATED = [
  "first path diagnosis",
  "recipe home",
  "core path tasks",
  "browsing opportunities",
  "basic application tracker",
  "opt-in helper visibility",
  "DMs",
];

function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-blue-strong)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5 8 14.5 16 5.5" />
    </svg>
  );
}

function FeatureBlock({
  title,
  subtitle,
  features,
}: {
  title: string;
  subtitle: string;
  features: readonly string[];
}) {
  return (
    <div className="rounded-[var(--landing-radius,0.75rem)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-medium text-[var(--ink)]">{title}</h2>
        <p className="text-[13px] text-[var(--ink-muted)]">{subtitle}</p>
      </div>
      <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--ink-muted)]">
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; plan?: string }>;
}) {
  const { upgraded, plan: highlight } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.rpc("get_my_billing").maybeSingle();
  if (!profile) redirect("/login");

  const pro = isPro(profile);
  const hasSubscription =
    profile.pro_source === "subscription" && Boolean(profile.stripe_customer_id);
  const proUntil = profile.pro_until
    ? new Date(profile.pro_until).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const { pro: proPlan, ultra } = PRICING;
  const preferUltra = highlight === "ultra";

  return (
    <main className="page-enter mx-auto max-w-3xl py-8 md:py-10">
      <div className="mb-6 flex items-center gap-2">
        <IconBolt className="h-5 w-5 text-[var(--accent-blue-strong)]" />
        <h1 className="text-2xl font-medium tracking-[-0.02em] text-[var(--ink)]">Plans</h1>
      </div>

      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
        Mission stays free. <strong className="font-medium text-[var(--ink)]">Pro</strong> buys
        velocity when an application matters.{" "}
        <strong className="font-medium text-[var(--ink)]">Ultra</strong> is interview-season
        intensity — roughly 2.4× Pro, for unlimited packs and priority coaching.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <article
          className={`rounded-[var(--landing-radius,0.75rem)] border p-6 ${
            preferUltra
              ? "border-[var(--border)] bg-[var(--surface)]"
              : "border-[var(--accent-blue)] bg-[var(--accent-blue-soft)]/30"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent-blue-strong)]">
            {proPlan.kicker}
          </p>
          <h2 className="mt-2 text-xl font-medium text-[var(--ink)]">{proPlan.name}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{proPlan.tagline}</p>
          <p className="mt-4 text-[2rem] font-medium tracking-[-0.03em] text-[var(--ink)]">
            {formatUsd(proPlan.monthly)}
            <span className="text-base font-normal text-[var(--ink-muted)]">/mo</span>
          </p>
          <p className="text-sm text-[var(--ink-muted)]">
            or {formatUsd(proPlan.semester)} / semester (one payment, 6 months)
          </p>
          <ul className="mt-4 space-y-2">
            {proPlan.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-[var(--ink-muted)]">
                <Check />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2">
            {pro ? (
              BILLING_ENABLED && hasSubscription ? (
                <form action={openBillingPortal}>
                  <button type="submit" className="btn-primary w-full">
                    Manage billing
                  </button>
                </form>
              ) : (
                <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)]">
                  {proUntil ? `You're on Pro through ${proUntil}.` : "You're on Pro."}
                </p>
              )
            ) : BILLING_ENABLED ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <form action={startCheckout} className="flex-1">
                  <input type="hidden" name="plan" value="monthly" />
                  <button type="submit" className="btn-primary w-full">
                    Pro monthly
                  </button>
                </form>
                <form action={startCheckout} className="flex-1">
                  <input type="hidden" name="plan" value="semester" />
                  <button type="submit" className="btn-ghost w-full">
                    Pro semester
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">Checkout coming soon.</p>
            )}
          </div>
        </article>

        <article
          className={`rounded-[var(--landing-radius,0.75rem)] border p-6 ${
            preferUltra
              ? "border-[var(--accent-blue)] bg-[var(--accent-blue-soft)]/30"
              : "border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent-blue-strong)]">
            {ultra.kicker}
          </p>
          <h2 className="mt-2 text-xl font-medium text-[var(--ink)]">{ultra.name}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{ultra.tagline}</p>
          <p className="mt-4 text-[2rem] font-medium tracking-[-0.03em] text-[var(--ink)]">
            {formatUsd(ultra.monthly)}
            <span className="text-base font-normal text-[var(--ink-muted)]">/mo</span>
          </p>
          <p className="text-sm text-[var(--ink-muted)]">
            or {formatUsd(ultra.semester)} / semester (one payment, 6 months)
          </p>
          <ul className="mt-4 space-y-2">
            {ultra.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-[var(--ink-muted)]">
                <Check />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2">
            {BILLING_ENABLED && ULTRA_BILLING_READY ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <form action={startCheckout} className="flex-1">
                  <input type="hidden" name="plan" value="ultra_monthly" />
                  <button type="submit" className="btn-primary w-full">
                    Ultra monthly
                  </button>
                </form>
                <form action={startCheckout} className="flex-1">
                  <input type="hidden" name="plan" value="ultra_semester" />
                  <button type="submit" className="btn-ghost w-full">
                    Ultra semester
                  </button>
                </form>
              </div>
            ) : (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--ink-muted)]">
                Ultra checkout lands when Stripe prices are live. Feature fence is ready in product
                copy.
              </p>
            )}
          </div>
        </article>
      </div>

      {upgraded && (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
          You&apos;re upgraded. Welcome.
        </p>
      )}

      <div className="mt-6 space-y-4">
        <FeatureBlock
          title="Why the gap"
          subtitle="Pro vs Ultra"
          features={[
            "Pro ($12) is everyday recruiting velocity without feeling expensive",
            "Ultra ($29) is ~2.4× Pro — priced for live interview loops, not cosmetics",
            "Semester options keep a recruiting cycle prepaid without monthly churn anxiety",
          ]}
        />
      </div>

      <p className="mt-6 text-sm leading-relaxed text-[var(--ink-muted)]">
        <span className="font-medium text-[var(--ink)]">Never gated:</span> {NEVER_GATED.join(", ")}.
      </p>
    </main>
  );
}
