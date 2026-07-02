import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/profile/EditProfileForm";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, year, major, bio, goals, skills, is_private, hide_school, heatmap_visibility")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: schoolRow } = await supabase
    .from("profile_school")
    .select("school")
    .eq("profile_id", user.id)
    .maybeSingle();

  return <EditProfileForm initial={{ ...profile, school: schoolRow?.school ?? "" }} />;
}
