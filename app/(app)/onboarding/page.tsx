import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scoreOverlap, type MatchSignal } from "@/lib/match";
import { isPro } from "@/lib/pro";
import SuggestedFollows, { SuggestedFollowsFallback, type SuggestedProfile } from "@/components/feed/SuggestedFollows";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

// First-run wizard, redirected into from app/auth/confirm/route.ts on a fresh
// signup confirmation. Skippable at every step — onboarded_at is only ever
// set by the wizard's own finish/skip action (app/(app)/onboarding/actions.ts),
// never gated elsewhere, so a user who never visits this route is unaffected.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, year, major, bio, is_pro, pro_until, onboarded_at, profile_school(school)")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/feed"); // already ran the wizard once

  const { data: suggestedPool } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at, year, major, goals, bio, is_pro, pro_until, is_founder, is_campus_founder, verified_student, profile_school(school)")
    .neq("id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const viewerSignal: MatchSignal = {
    year: profile.year,
    major: profile.major,
    goals: null,
    bio: profile.bio,
    school: profile.profile_school?.school ?? null,
  };
  const suggested: SuggestedProfile[] = (suggestedPool ?? [])
    .map((s) => ({
      ...s,
      _score: scoreOverlap(viewerSignal, {
        year: s.year,
        major: s.major,
        goals: s.goals,
        bio: s.bio,
        school: s.profile_school?.school ?? null,
      }),
    }))
    .sort((a, b) => b._score - a._score || ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1))
    .slice(0, 5);
  const viewerPro = isPro(profile);

  return (
    <OnboardingWizard
      profile={{
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        school: profile.profile_school?.school ?? "",
        year: profile.year,
        major: profile.major,
        bio: profile.bio,
      }}
      followStep={
        suggested.length > 0 ? (
          <Suspense fallback={<SuggestedFollowsFallback suggested={suggested} />}>
            <SuggestedFollows userId={user.id} viewerSignal={viewerSignal} viewerPro={viewerPro} suggested={suggested} />
          </Suspense>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">No suggestions yet. Check back once more students join.</p>
        )
      }
    />
  );
}
