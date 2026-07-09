import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPro } from "@/lib/pro";
import { IconBolt } from "@/components/icons";
import { joinProWaitlist, openBillingPortal, startCheckout } from "./actions";

const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

const GROUPS: { title: string; subtitle: string; features: string[] }[] = [
  {
    title: "Express",
    subtitle: "Make your profile yours",
    features: [
      "Pro badge on your profile",
      "Custom profile accent color",
      "Profile banner",
      "Animated profile picture (GIF / animated-webp)",
    ],
  },
  {
    title: "Connect",
    subtitle: "Let AI find your people",
    features: [
      "Unlimited natural-language people search",
      "Unlimited AI on a stronger model",
      "Improve my post: AI rewrites your draft",
      "Unlimited AI icebreaker for first messages",
    ],
  },
  {
    title: "Belong",
    subtitle: "See and be seen",
    features: [
      "See who viewed your profile",
    ],
  },
];

const COMING_SOON_TO_PRO = [
  "Weekly “3 people to meet”",
  "Profile themes",
];

const NEVER_GATED = [
  ".edu verify",
  "posting",
  "following",
  "DMs",
  "private accounts",
  "feed",
  "reactions",
];

// Inline check glyph — matches the project's inline-SVG icon convention.
function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5 8 14.5 16 5.5" />
    </svg>
  );
}

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
    .select("is_pro, wants_pro")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const pro = isPro(profile);

  return (
    <main className="page-enter mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 flex items-center gap-2">
        <IconBolt className="h-5 w-5 text-[var(--blue)]" />
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Pro</h1>
      </div>

      <p className="mb-6 text-[15px] leading-relaxed text-[var(--ink-muted)]">
        Express who you are. Let AI find your people. Unlimited.
      </p>

      {/* Pricing */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <p className="text-sm font-medium text-[var(--ink)]">Monthly</p>
          <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.03em] text-[var(--ink)]">
            $4.99<span className="text-lg font-normal text-[var(--ink-muted)]">/mo</span>
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Billed monthly.</p>
        </div>
        <div className="card shadow-paper relative bg-[var(--featured-surface)] p-6">
          <span className="absolute right-4 top-4 rounded-full bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--blue)]">
            Best value
          </span>
          <p className="text-sm font-medium text-[var(--ink)]">Semester</p>
          <p className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.03em] text-[var(--ink)]">
            $12.99<span className="text-lg font-normal text-[var(--ink-muted)]">/semester</span>
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">One payment covers the whole term.</p>
        </div>
      </div>

      {/* Status / waitlist */}
      <div className="mt-4 card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">samehere Pro</span>
          {!pro && !BILLING_ENABLED && (
            <span className="rounded-full bg-[var(--featured-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-muted)]">
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
              <form action={startCheckout} className="flex-1">
                <input type="hidden" name="plan" value="monthly" />
                <button type="submit" className="btn-primary w-full">
                  Subscribe monthly
                </button>
              </form>
              <form action={startCheckout} className="flex-1">
                <input type="hidden" name="plan" value="semester" />
                <button type="submit" className="btn-primary w-full">
                  Subscribe for a semester
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

      {/* What's included — grouped as divided sections, not a grid of identical cards */}
      <div className="mt-4 card shadow-paper overflow-hidden">
        {GROUPS.map((g, i) => (
          <div key={g.title} className={i > 0 ? "border-t border-[var(--border)] p-6" : "p-6"}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">{g.title}</h2>
              <p className="text-[13px] text-[var(--ink-muted)]">{g.subtitle}</p>
            </div>
            <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
              {g.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--ink-muted)]">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className="mt-4 card p-6">
        <h2 className="text-[15px] font-semibold text-[var(--ink)]">Coming soon to Pro</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {COMING_SOON_TO_PRO.map((f) => (
            <li key={f} className="rounded-full border border-[var(--border)] bg-[var(--canvas)] px-3 py-1 text-sm text-[var(--ink-muted)]">
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Never gated */}
      <p className="mt-6 text-sm leading-relaxed text-[var(--ink-muted)]">
        <span className="font-medium text-[var(--ink)]">Never gated:</span>{" "}
        {NEVER_GATED.join(", ")}.
      </p>
    </main>
  );
}
