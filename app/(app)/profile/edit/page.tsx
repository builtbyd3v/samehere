import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/profile/EditProfileForm";
import ExperienceEditor from "@/components/profile/ExperienceEditor";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile, school, and experiences all key off user.id and are independent — fetch together.
  const [{ data: profile }, { data: schoolRow }, { data: experiences }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, display_name, avatar_url, banner_url, year, major, bio, goals, is_private, hide_school, heatmap_visibility, is_pro, pro_until, profile_theme"
      )
      .eq("id", user.id)
      .single(),
    supabase.from("profile_school").select("school").eq("profile_id", user.id).maybeSingle(),
    supabase
      .from("experiences")
      .select("id, kind, org, role, term, note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!profile) redirect("/login");

  return (
    <>
      <EditProfileForm initial={{ ...profile, id: user.id, school: schoolRow?.school ?? "" }} />
      <div className="mx-auto max-w-xl px-5 pb-10">
        <ExperienceEditor initial={experiences ?? []} />
      </div>
    </>
  );
}
