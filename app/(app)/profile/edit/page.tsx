import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/profile/EditProfileForm";
import ExperienceEditor from "@/components/profile/ExperienceEditor";
import EducationEditor from "@/components/profile/EducationEditor";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile, school, experiences, and education all key off user.id and are independent — fetch together.
  const [{ data: profile }, { data: schoolRow }, { data: experiences }, { data: education }] = await Promise.all([
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
      .select("id, kind, org, role, term, note, start_date, end_date, is_current")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("education")
      .select("id, school, degree, field, start_date, end_date, school_domain, is_current")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!profile) redirect("/login");

  // Attach company logos to experiences the same way the profile page does:
  // one job_companies lookup over the distinct orgs, exact name match (the
  // simplify cache is the only source; a miss falls back to a monogram).
  const orgs = [...new Set((experiences ?? []).map((e) => e.org))];
  const { data: companies } = orgs.length
    ? await supabase.from("job_companies").select("name, logo_url").in("name", orgs)
    : { data: [] as { name: string; logo_url: string | null }[] };
  const logoByOrg = new Map((companies ?? []).map((c) => [c.name.trim().toLowerCase(), c.logo_url]));
  const experiencesWithLogo = (experiences ?? []).map((e) => ({
    ...e,
    logo_url: logoByOrg.get(e.org.trim().toLowerCase()) ?? null,
  }));

  return (
    <>
      <EditProfileForm initial={{ ...profile, id: user.id, school: schoolRow?.school ?? "" }} />
      {/* Experience + Education auto-save through their own actions; the single
          Save below submits only the profile-fields form (EditProfileForm,
          id="edit-profile-form") via the form attribute. Kept in one container
          so the Save sits right under the last card, not in an empty band. */}
      <div className="mx-auto max-w-xl px-5 pb-16">
        <ExperienceEditor initial={experiencesWithLogo} />
        <EducationEditor initial={education ?? []} />
        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <button
            type="submit"
            form="edit-profile-form"
            className="btn-primary w-full !py-2.5 text-[15px]"
          >
            Save profile
          </button>
          <p className="mt-2 text-center text-xs text-[var(--ink-muted)]">
            Saves your profile details. Experience and education save as you add them.
          </p>
        </div>
      </div>
    </>
  );
}
