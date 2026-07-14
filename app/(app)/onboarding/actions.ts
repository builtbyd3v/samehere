"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";
import { peopleSearchCore } from "@/lib/people-search";

// `updateProfile` (profile/edit/actions.ts — peer-owned, imported not edited)
// always calls redirect(`/profile/${username}`) on success. That's correct for
// the standalone edit-profile page, but here it would bounce the viewer out of
// the wizard before steps 2/3. Next's redirect() works by throwing an error
// tagged with a `NEXT_REDIRECT`-prefixed `digest`; we catch only that specific
// signal and treat it as success, letting the wizard advance to the next step
// on the client instead of navigating away. Any other thrown error rethrows.
function isRedirectSignal(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function saveOnboardingBasics(prev: EditState, formData: FormData): Promise<EditState> {
  try {
    return await updateProfile(prev, formData);
  } catch (err) {
    if (isRedirectSignal(err)) return {}; // updateProfile succeeded; its own redirect is swallowed here
    throw err;
  }
}

// Own-row update — RLS "owner write" policy on profiles already covers this
// (see Security Requirements #5 in CLAUDE.md), no new definer function needed.
export async function finishOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  redirect("/feed");
}

// Experience is now saved through the shared addExperience action
// (app/(app)/profile/edit/actions.ts) directly from OnboardingWizard, same as
// education through addEducation — no onboarding-local wrapper needed.

export type OnboardingMatch = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
  year: string | null;
  major: string | null;
  reason: string | null;
};

// Final wizard step's "front door" moment: live AI peer matches seeded from
// the major/goals the user just saved in step 1 (not a query they typed).
// Server-initiated, so it runs with skipQuota -- it must never spend the
// user's own daily people-search cap. Falls back to get_suggested_profiles
// (same RPC as the feed's right rail) when major/goals are both empty, since
// there's nothing to build a seed query from. Empty either way → [] so the
// caller can skip the step instead of showing a dead end.
export async function getOnboardingMatches(): Promise<OnboardingMatch[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("major, goals, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  // skipQuota makes this a free AI call — only the not-yet-onboarded may take
  // it, or any signed-in user could replay this action as an unmetered search.
  if (profile?.onboarded_at) return [];
  const major = profile?.major?.trim() || "";
  const goals = profile?.goals?.trim() || "";

  let seed = "";
  if (major && goals) seed = `students studying ${major} who want ${goals}`;
  else if (major) seed = `students studying ${major}`;
  else if (goals) seed = `students who want ${goals}`;

  if (!seed) {
    const { data } = await supabase.rpc("get_suggested_profiles", { p_limit: 3 });
    return (data ?? []).map((r) => ({
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      is_pro: r.is_pro,
      is_founder: r.is_founder,
      is_campus_founder: r.is_campus_founder,
      verified_student: r.verified_student,
      year: r.year,
      major: r.major,
      reason: null,
    }));
  }

  const state = await peopleSearchCore(supabase, user, seed, { skipQuota: true });
  const results = (state.results ?? []).slice(0, 3);
  if (results.length === 0) return [];

  // peopleSearchCore's result shape has no year/major (see PeopleSearch.tsx,
  // its only other caller, which doesn't need one) -- one extra lookup here.
  const { data: extra } = await supabase
    .from("profiles")
    .select("id, year, major")
    .in("id", results.map((r) => r.id));
  const extraById = new Map((extra ?? []).map((e) => [e.id, e]));

  return results.map((r) => ({
    ...r,
    year: extraById.get(r.id)?.year ?? null,
    major: extraById.get(r.id)?.major ?? null,
  }));
}
