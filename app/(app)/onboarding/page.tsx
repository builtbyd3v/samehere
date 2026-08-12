import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

// First-run path intake, redirected into from auth confirm on a fresh signup.
// Skippable — onboarded_at is only set by finishOnboarding / submitPathIntake.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "username, display_name, avatar_url, year, major, bio, onboarded_at, profile_school(school)",
    )
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/home");

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
    />
  );
}
