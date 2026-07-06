import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPro } from "@/lib/pro";
import { IconBolt, IconCrown } from "@/components/icons";
import { joinProWaitlist, startCheckout, openBillingPortal } from "./actions";

const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

const GROUPS: { title: string; features: string[] }[] = [
  {
    title: "Stand out",
    features: [
      "Pro badge on profile",
      "Custom profile accent color",
      "Animated profile picture (GIF / animated-webp)",
    ],
  },
  {
    title: "Insights",
    features: ["See who viewed your profile"],
  },
];

const COMING_SOON_TO_PRO = [
  "Unlimited AI + a smarter model",
  "AI icebreaker for your first message",
  "Early access to new features",
];

const NEVER_GATED = [
  ".edu verify",
  "posting",
  "following",
  "private accounts",
  "feed",
  "reactions",
];

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, wants_pro, is_founder")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const pro = isPro(profile);

  return (
    <main className="page-enter mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 flex items-center gap-2">
        <IconBolt className="h-5 w-5 text-[var(--blue)]" />
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Pro</h1>
        {profile.is_founder && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            <IconCrown className="h-3 w-3 text-[var(--blue)]" />
            Founder
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <p className="text-sm font-medium text-[var(--ink)]">Monthly</p>
          <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.03em] text-[var(--ink)]">
            $4.99<span className="text-lg font-normal text-[var(--ink-muted)]">/mo</span>
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Billed monthly.</p>
        </div>
        <div className="card relative border-[var(--border-strong)] bg-[var(--featured-surface)] p-6">
          <span className="absolute right-4 top-4 rounded-full border border-[var(--border-strong)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            Best value
          </span>
          <p className="text-sm font-medium text-[var(--ink)]">Semester</p>
          <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.03em] text-[var(--ink)]">
            $12.99<span className="text-lg font-normal text-[var(--ink-muted)]">/semester</span>
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Billed each semester.</p>
        </div>
      </div>

      {/* Status / waitlist */}
      <div className="mt-4 card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">samehere Pro</span>
          {!pro && !BILLING_ENABLED && (
            <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
              Coming soon
            </span>
          )}
        </div>

        <div className="mt-4">
          {upgraded && (
            <p className="mb-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
              You&apos;re upgraded to Pro. Welcome.
            </p>
          )}
          {pro ? (
            BILLING_ENABLED ? (
              <form action={openBillingPortal}>
                <button type="submit" className="btn-primary w-full">
                  Manage billing
                </button>
              </form>
            ) : (
              <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--ink)]">
                You&apos;re on Pro.
              </p>
            )
          ) : BILLING_ENABLED ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={startCheckout.bind(null, "monthly")} className="flex-1">
                <button type="submit" className="btn-primary w-full">
                  Go Pro — Monthly
                </button>
              </form>
              <form action={startCheckout.bind(null, "semester")} className="flex-1">
                <button type="submit" className="btn-primary w-full">
                  Go Pro — Semester
                </button>
              </form>
            </div>
          ) : profile.wants_pro ? (
            <p className="text-sm text-[var(--ink-muted)]">
              You&apos;re on the list. We&apos;ll email you when Pro opens.
            </p>
          ) : (
            <form action={joinProWaitlist}>
              <button type="submit" className="btn-primary w-full">
                Join waitlist
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Feature groups */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <div key={g.title} className="card p-6">
            <h2 className="text-sm font-semibold text-[var(--ink)]">{g.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
              {g.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-[var(--ink-faint)]">+</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className="mt-4 card p-6">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Coming soon to Pro</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
          {COMING_SOON_TO_PRO.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-[var(--ink-faint)]">+</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Founder badge callout */}
      <div className="mt-4 flex items-start gap-3 card px-5 py-4">
        <IconCrown className="mt-0.5 h-5 w-5 shrink-0 text-[var(--blue)]" />
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          <span className="font-medium text-[var(--ink)]">Founder badge</span> on your profile for
          the first 100 students who sign up. Permanent, on any plan.
        </p>
      </div>

      {/* Never gated */}
      <p className="mt-6 text-sm leading-relaxed text-[var(--ink-muted)]">
        <span className="font-medium text-[var(--ink)]">Never gated:</span>{" "}
        {NEVER_GATED.join(", ")}.
      </p>
    </main>
  );
}
