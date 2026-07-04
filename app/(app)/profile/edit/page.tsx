import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/profile/EditProfileForm";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile and school both key off user.id and are independent — fetch together.
  const [{ data: profile }, { data: schoolRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, display_name, avatar_url, year, major, bio, goals, skills, is_private, hide_school, heatmap_visibility, is_pro, accent_color"
      )
      .eq("id", user.id)
      .single(),
    supabase.from("profile_school").select("school").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/login");

  return <EditProfileForm initial={{ ...profile, id: user.id, school: schoolRow?.school ?? "" }} />;
}
