import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { onboardingPrefill, parseOnboardingSource } from "@/lib/onboarding";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { from } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, settings] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, year, major, bio, stage, focus_areas, open_to, profile_school(school)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("portfolio_settings")
      .select("publish_intro, publish_projects, publish_experience, publish_education")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);
  if (!profile) redirect("/login");

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
      prefill={onboardingPrefill(profile, settings.error ? undefined : settings.data)}
      source={parseOnboardingSource(from)}
    />
  );
}
