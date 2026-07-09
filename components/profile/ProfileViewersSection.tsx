import { createClient } from "@/lib/supabase/server";
import ProfileViewers, { type ProfileViewer } from "@/components/profile/ProfileViewers";

// Owner-only "who viewed your profile" card — does its own fetch
// (get_profile_views RPC) so it streams in behind its own Suspense boundary
// instead of blocking the rest of the profile page.
export default async function ProfileViewersSection({
  profileId,
  profileIsPro,
}: {
  profileId: string;
  profileIsPro: boolean;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_profile_views", { p_profile: profileId });
  const profileViews = (data ?? []) as ProfileViewer[];

  return (
    <ProfileViewers
      isPro={profileIsPro}
      count={profileViews.length}
      recent={profileIsPro ? profileViews.slice(0, 30) : []}
    />
  );
}
