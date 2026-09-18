import type { Tables } from "@/types/database.types";

export type ProGrant = Pick<Tables<"profiles">, "is_pro" | "pro_until">;

export type ProCapabilities = {
  customizeAppearance: boolean;
  reorderSections: boolean;
  readAnalytics: boolean;
  higherAnalysisAllowance: boolean;
};

// is_pro is the grant flag; pro_until is when it lapses. The nightly pg_cron sweep
// (expire_lapsed_pro) flips is_pro off for lapsed one-time buyers, but a missed run
// would otherwise leave Pro on forever. Checking pro_until here makes the flag and
// the timestamp unable to disagree — a missed sweep degrades to "Pro ends on time".
// pro_until === null = a comped/manual grant that never expires.
export const isPro = (p: ProGrant) =>
  p.is_pro === true && (p.pro_until === null || new Date(p.pro_until) > new Date());

export function proCapabilities(p: ProGrant): ProCapabilities {
  const active = isPro(p);
  return {
    customizeAppearance: active,
    reorderSections: active,
    readAnalytics: active,
    higherAnalysisAllowance: active,
  };
}

// Checkout return ?upgraded=1 is a UI hint only. Billing state on the profile
// is the only source of Pro. Never treat the query as a grant.
export function welcomeAfterCheckout(upgraded: string | undefined, profile: ProGrant): boolean {
  return upgraded === "1" && isPro(profile);
}
