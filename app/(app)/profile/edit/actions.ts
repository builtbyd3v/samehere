"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled, generateText } from "@/lib/ai";
import { fallbackProfileNudge, getProfileGaps } from "@/lib/profile-completion";

const YEARS = ["freshman", "sophomore", "junior", "senior", "grad"];

export type EditState = { error?: string };

// Update the signed-in user's profile. All writes go through the session client,
// so RLS enforces that a user can only edit their own row. School lives in a
// separate table (its own visibility RLS); prefs (is_private / hide_school /
// heatmap_visibility) live on profiles.
export async function updateProfile(_prev: EditState, formData: FormData): Promise<EditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  // Trim + cap every free-text field at the trust boundary.
  const str = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);

  const yearRaw = str("year", 20);

  const updates = {
    display_name: str("display_name", 50) || null,
    major: str("major", 100) || null,
    bio: str("bio", 500) || null,
    goals: str("goals", 500) || null,
    year: YEARS.includes(yearRaw) ? yearRaw : null,
    skills: parseSkills(String(formData.get("skills") ?? "")),
  };

  const { error: pErr } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (pErr) return { error: "Could not save your profile. Try again." };

  const school = str("school", 100) || null;
  const { error: sErr } = await supabase
    .from("profile_school")
    .upsert({ profile_id: user.id, school }, { onConflict: "profile_id" });
  if (sErr) return { error: "Could not save your school. Try again." };

  // 1 pt for a profile update; the 7-day cooldown + dedupe live inside the
  // definer function, so calling it on every save is safe (can't be farmed).
  await supabase.rpc("log_contribution", { p_action_type: "profile_update" });

  const { data: prof } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  redirect(`/profile/${prof?.username ?? ""}`);
}

// On-demand profile-completion nudge. Metered via use_ai_quota; static fallback
// when AI is off, over quota, or the call fails.
export async function profileNudge(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallbackProfileNudge([]);

  const [{ data: profile }, { data: schoolRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, year, major, bio, goals, skills")
      .eq("id", user.id)
      .single(),
    supabase.from("profile_school").select("school").eq("profile_id", user.id).maybeSingle(),
  ]);

  const gaps = getProfileGaps({
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    school: schoolRow?.school ?? "",
    year: profile?.year ?? null,
    major: profile?.major ?? null,
    bio: profile?.bio ?? null,
    goals: profile?.goals ?? null,
    skills: profile?.skills ?? null,
  });

  if (gaps.length === 0) return fallbackProfileNudge([]);

  if (aiEnabled()) {
    const { data: allowed } = await supabase.rpc("use_ai_quota", {
      p_kind: "profile_nudge",
      p_cap: 3,
    });
    if (allowed) {
      const missing = gaps.map((g) => g.replace("_", " ")).join(", ");
      const text = await generateText(
        "Give one short, specific tip for a student to improve their social profile. One sentence. Mention which field to fill. No greeting, no quotes.",
        `Missing or weak fields: ${missing}.`,
        100,
      );
      if (text) return text;
    }
  }

  return fallbackProfileNudge(gaps);
}

// "a, b, a , ,c" -> ["a","b","c"], trimmed, de-duped, capped.
function parseSkills(raw: string): string[] | null {
  const skills = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().slice(0, 30))
        .filter(Boolean)
    )
  ).slice(0, 20);
  return skills.length ? skills : null;
}
