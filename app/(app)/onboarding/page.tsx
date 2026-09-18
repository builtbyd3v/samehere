import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, year, major, bio, profile_school(school)")
    .eq("id", user.id)
    .single();
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
    />
  );
}
