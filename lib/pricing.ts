/** Paid path plans — display + feature fencing. Stripe price IDs stay in env. */

export type PaidPlanId = "pro" | "ultra";

export const PRICING = {
  free: {
    id: "free" as const,
    name: "Free",
    kicker: "Mission",
    tagline: "Diagnose the gap and make the next useful move.",
    monthly: 0,
    semester: 0,
    features: [
      "Initial diagnosis and adaptive path home",
      "Core path tasks and application tracking",
      "Opportunity browsing with fit guidance",
      "One focused next move at a time",
      "Company helpers when peers opt in",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    kicker: "Velocity",
    tagline: "Move faster when an application or interview matters now.",
    /** Recommended list price — update Stripe prices to match before enabling billing. */
    monthly: 12,
    semester: 29,
    features: [
      "Everything in Free",
      "Unlimited path re-diagnosis",
      "Listing pitches and deeper project plans",
      "Company interview practice + AI feedback",
      "Stronger model with higher daily caps",
    ],
  },
  ultra: {
    id: "ultra" as const,
    name: "Ultra",
    kicker: "Interview season",
    tagline: "Full coach intensity when the cycle is live.",
    monthly: 29,
    semester: 79,
    features: [
      "Everything in Pro",
      "Unlimited interview packs and feedback",
      "Priority helper icebreakers on target orgs",
      "Concurrent projects + plan regen without waiting",
      "Highest model tier and weekly path sprint nudges",
    ],
  },
} as const;

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0";
  return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

/**
 * Pricing rationale (for humans + agents):
 * - Pro at $12/mo (~2.4× old $4.99) stays impulse-affordable for students
 *   while signaling a real product; semester $29 ≈ $4.80/mo.
 * - Ultra at $29/mo (~2.4× Pro) matches ResuMax-class interview intensity
 *   without jumping to $49; semester $79 ≈ $13/mo for recruiting season.
 * - Gap is large enough that Ultra feels like a deliberate upgrade, not a
 *   rounding error — sell outcome velocity, not cosmetics.
 */
export const PRICING_RATIONALE = {
  proMonthly: 12,
  ultraMonthly: 29,
  multiple: "Ultra ≈ 2.4× Pro monthly",
} as const;
