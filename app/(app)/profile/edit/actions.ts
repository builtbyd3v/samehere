"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled, generateText, modelForTier, type AiResult } from "@/lib/ai";
import { PROFILE_DRAFT_SYSTEM, PROFILE_NUDGE_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { isPro } from "@/lib/pro";
import { isProfileTheme } from "@/lib/themes";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { fallbackProfileNudge, getProfileGaps } from "@/lib/profile-completion";
import { DEGREE_VALUES as DEGREE_VALUES_RAW } from "@/lib/education-options";
import { resolveInstitutionDomain } from "@/lib/resolve-domain";

// DEGREE_VALUES infers as a narrow string-literal union array (mapped from an
// `as const` options list), which Array.includes can't check against a plain
// `string`. Widen once here rather than touching the shared options file.
const DEGREE_VALUES: readonly string[] = DEGREE_VALUES_RAW;
import type { TablesUpdate } from "@/types/database.types";

const EXPERIENCE_KINDS = ["internship", "job", "research", "club_role"];

const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_BANNER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BANNER_BYTES = 4 * 1024 * 1024;

export type EditState = { error?: string };
export type AvatarState = { error?: string; url?: string };

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

  const updates: TablesUpdate<"profiles"> = {
    display_name: str("display_name", 50) || null,
    bio: str("bio", 500) || null,
    goals: str("goals", 500) || null,
  };

  // Trust boundary: never take the client's word for Pro status. Non-Pro
  // requests simply don't touch profile_theme (a lapsed Pro keeps their
  // theme until they next edit it).
  const { data: proRow } = await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single();
  if (isPro(proRow ?? { is_pro: false, pro_until: null })) {
    const themeRaw = str("profile_theme", 20);
    updates.profile_theme = isProfileTheme(themeRaw) ? themeRaw : null;
  }

  const { error: pErr } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (pErr) return { error: "Could not save your profile. Try again." };

  // 1 pt for a profile update is awarded by the profiles_award_contribution
  // AFTER UPDATE trigger (fires only when a meaningful content field changed;
  // 7-day cooldown + dedupe live in the trigger) — nothing to call here.

  getPostHogServerClient()?.capture({ distinctId: user.id, event: "profile_updated" });

  const { data: prof } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  redirect(`/profile/${prof?.username ?? ""}`);
}

// On-demand profile-completion nudge. Metered via use_ai_quota; static fallback
// when AI is off, over quota, or the call fails.
export async function profileNudge(): Promise<AiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { text: fallbackProfileNudge([]) };

  const [{ data: profile }, { data: schoolRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, year, major, bio, goals, is_pro, pro_until")
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
  });

  if (gaps.length === 0) return { text: fallbackProfileNudge([]) };

  if (aiEnabled()) {
    const pro = isPro(profile ?? { is_pro: false, pro_until: null });
    const { data: allowed } = await supabase.rpc("use_ai_quota", { p_kind: "profile_nudge" });
    // Free user out of quota → upsell; Pro can't realistically hit the cap.
    if (!allowed) return pro ? { text: fallbackProfileNudge(gaps) } : { overCap: true };
    const missing = gaps.map((g) => g.replace("_", " ")).join(", ");
    const text = await generateText(
      PROFILE_NUDGE_SYSTEM,
      `Missing or weak fields: ${missing}.`,
      { model: modelForTier(pro), maxTokens: 100, temperature: 0.3 },
    );
    if (text) return { text };
  }

  return { text: fallbackProfileNudge(gaps) };
}

export type DraftState = { bio?: string; goals?: string; overCap?: boolean; error?: string };

// On-demand bio + goals draft from the reader's own profile facts. Free,
// metered on the same profile_nudge quota as the nudge above (no new DB kind).
export async function draftProfileText(): Promise<DraftState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  if (!aiEnabled()) return { error: "AI is unavailable right now." };

  const [{ data: p }, { data: schoolRow }] = await Promise.all([
    supabase.from("profiles").select("display_name, year, major, is_pro, pro_until").eq("id", user.id).single(),
    supabase.from("profile_school").select("school").eq("profile_id", user.id).maybeSingle(),
  ]);
  const pro = isPro(p ?? { is_pro: false, pro_until: null });
  const { data: allowed } = await supabase.rpc("use_ai_quota", { p_kind: "profile_nudge" });
  if (!allowed) return pro ? { error: "Try again." } : { overCap: true };

  const facts = [
    p?.display_name ? `name: ${untrusted(p.display_name)}` : "",
    p?.major ? `major: ${untrusted(p.major)}` : "",
    schoolRow?.school ? `school: ${untrusted(schoolRow.school)}` : "",
  ].filter(Boolean).join("\n");

  const raw = await generateText(PROFILE_DRAFT_SYSTEM, `Facts:\n${facts || "(no facts yet)"}`, {
    model: modelForTier(pro),
    maxTokens: 220,
    temperature: 0.3,
  });
  if (!raw) return { error: "Couldn't draft right now. Try again." };
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const obj = JSON.parse(cleaned);
    const bio = typeof obj?.bio === "string" ? obj.bio.slice(0, 500) : undefined;
    const goals = typeof obj?.goals === "string" ? obj.goals.slice(0, 500) : undefined;
    if (!bio && !goals) return { error: "Couldn't draft right now. Try again." };
    return { bio, goals };
  } catch {
    return { error: "Couldn't draft right now. Try again." };
  }
}

// Upload an avatar server-side so MIME/size/animation checks can't be
// bypassed from the browser. Animated images (gif/webp/apng) are Pro-only —
// trust boundary lives here, not in the client's <input accept>.
export async function uploadAvatar(_prev: AvatarState, formData: FormData): Promise<AvatarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (!ALLOWED_AVATAR_MIME.has(file.type)) return { error: "Choose an image file." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "Image must be under 2 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const animated = isAnimated(bytes, file.type);

  if (animated) {
    const { data: proRow } = await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single();
    if (!isPro(proRow ?? { is_pro: false, pro_until: null })) return { error: "Animated avatars are a Pro perk." };
  }

  const path = `${user.id}/avatar`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (upErr) return { error: "Upload failed. Try again." };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: url, avatar_is_animated: animated })
    .eq("id", user.id);
  if (dbErr) return { error: "Saved the image but couldn't update your profile." };

  return { url };
}

// Upload a profile banner. Pro-only perk — gated server-side here AND frozen
// for non-Pro rows by the guard_profile_privileged trigger. Stored in the same
// public avatars bucket at <uid>/banner (owner-scoped upload policy covers it).
export async function uploadBanner(_prev: AvatarState, formData: FormData): Promise<AvatarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: proRow } = await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single();
  if (!isPro(proRow ?? { is_pro: false, pro_until: null })) return { error: "Profile banners are a Pro perk." };

  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (!ALLOWED_BANNER_MIME.has(file.type)) return { error: "Choose a JPG, PNG, or WebP image." };
  if (file.size > MAX_BANNER_BYTES) return { error: "Image must be under 4 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${user.id}/banner`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (upErr) return { error: "Upload failed. Try again." };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: dbErr } = await supabase.from("profiles").update({ banner_url: url }).eq("id", user.id);
  if (dbErr) return { error: "Saved the image but couldn't update your profile." };

  return { url };
}

export type ExperienceState = { error?: string };

// Turn a month/year pair from the form into an ISO date (day fixed to the
// 1st, since the form only collects month + year). Returns null for an
// unset field ("currently here" leaves end_month/end_year empty) or a
// year outside a sane human-career range.
function toDate(month: string, year: string): string | null {
  const y = Number(year);
  if (!Number.isInteger(y)) return null;
  const now = new Date().getFullYear();
  if (y < now - 15 || y > now + 8) return null; // sane range
  const m = Math.min(12, Math.max(1, Number(month) || 1));
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

// Add one experience entry. Server-side validates the same constraints the
// DB already enforces (length, kind enum) so a bad request fails with a
// friendly message instead of a raw 23514 constraint error; the 10-row cap
// is enforced by the experiences_cap trigger and surfaced below.
export async function addExperience(_prev: ExperienceState, formData: FormData): Promise<ExperienceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const str = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);

  const kind = str("kind", 20);
  if (!EXPERIENCE_KINDS.includes(kind)) return { error: "Choose a type." };

  const org = str("org", 80);
  const role = str("role", 80);
  if (!org || !role) return { error: "Org and role are required." };

  const start_date = toDate(str("start_month", 2), str("start_year", 4));
  const end_date = toDate(str("end_month", 2), str("end_year", 4));
  if (start_date && end_date && end_date < start_date) {
    return { error: "End date must be after the start date." };
  }

  const note = str("note", 600) || null;
  const isCurrent = formData.get("is_current") === "on";

  const { error } = await supabase
    .from("experiences")
    .insert({ user_id: user.id, kind, org, role, start_date, end_date, note, is_current: isCurrent });
  if (error) {
    if (error.message.includes("limit: at most 10 experiences")) return { error: "Max 10 experiences." };
    return { error: "Could not add experience. Try again." };
  }

  const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  revalidatePath("/profile/edit");
  if (prof?.username) revalidatePath(`/profile/${prof.username}`);

  return {};
}

// Update one of the caller's own experiences. Mirrors addExperience's
// validation; RLS (auth.uid() = user_id) enforces ownership on the update.
export async function updateExperience(
  id: string,
  _prev: ExperienceState,
  formData: FormData,
): Promise<ExperienceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const str = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);

  const kind = str("kind", 20);
  if (!EXPERIENCE_KINDS.includes(kind)) return { error: "Choose a type." };

  const org = str("org", 80);
  const role = str("role", 80);
  if (!org || !role) return { error: "Org and role are required." };

  const start_date = toDate(str("start_month", 2), str("start_year", 4));
  const end_date = toDate(str("end_month", 2), str("end_year", 4));
  if (start_date && end_date && end_date < start_date) {
    return { error: "End date must be after the start date." };
  }

  const note = str("note", 600) || null;
  const isCurrent = formData.get("is_current") === "on";

  const { error } = await supabase
    .from("experiences")
    .update({ kind, org, role, start_date, end_date, note, is_current: isCurrent })
    .eq("id", id);
  if (error) return { error: "Could not update experience. Try again." };

  const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  revalidatePath("/profile/edit");
  if (prof?.username) revalidatePath(`/profile/${prof.username}`);

  return {};
}

// Delete one of the caller's own experiences. RLS (auth.uid() = user_id)
// enforces ownership; no need to re-check it here.
export async function deleteExperience(id: string): Promise<ExperienceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("experiences").delete().eq("id", id);
  if (error) return { error: "Could not delete experience. Try again." };

  const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  revalidatePath("/profile/edit");
  if (prof?.username) revalidatePath(`/profile/${prof.username}`);

  return {};
}

export type EducationState = { error?: string };

// Add one education entry. Mirrors addExperience: school is required, degree
// is required + validated against DEGREE_VALUES, field is optional, dates
// parse the same way, and the 5-row cap is enforced by a DB trigger and
// surfaced below. On success, derived profile fields (major/year/school) are
// re-synced from the current education entry.
export async function addEducation(_prev: EducationState, formData: FormData): Promise<EducationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const str = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);

  const school = str("school", 80);
  if (!school) return { error: "School is required." };

  const degree = str("degree", 80);
  if (!DEGREE_VALUES.includes(degree)) return { error: "Choose a degree." };

  const field = str("field", 80) || null;
  // A listed US school carries its domain from the autocomplete. An outside
  // institution (e.g. a certificate provider) does not, so resolve one so it
  // still gets a logo. Best-effort; null falls back to a monogram.
  let school_domain = str("school_domain", 255) || null;
  if (!school_domain && school) school_domain = await resolveInstitutionDomain(school);

  const start_date = toDate(str("start_month", 2), str("start_year", 4));
  const end_date = toDate(str("end_month", 2), str("end_year", 4));
  if (start_date && end_date && end_date < start_date) {
    return { error: "End date must be after the start date." };
  }

  const isCurrent = formData.get("is_current") === "on";

  const { error } = await supabase
    .from("education")
    .insert({ user_id: user.id, school, degree, field, school_domain, start_date, end_date, is_current: isCurrent });
  if (error) {
    if (error.message.includes("limit: at most 5 education")) return { error: "Max 5 education entries." };
    return { error: "Could not add education. Try again." };
  }

  await syncAcademicFromCurrentEducation(supabase, user.id);

  const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  revalidatePath("/profile/edit");
  if (prof?.username) revalidatePath(`/profile/${prof.username}`);

  return {};
}

// Update one of the caller's own education entries. Mirrors addEducation's
// validation; RLS (auth.uid() = user_id) enforces ownership on the update, so
// there's no cap check here (a cap only matters on insert).
export async function updateEducation(
  id: string,
  _prev: EducationState,
  formData: FormData,
): Promise<EducationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const str = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);

  const school = str("school", 80);
  if (!school) return { error: "School is required." };

  const degree = str("degree", 80);
  if (!DEGREE_VALUES.includes(degree)) return { error: "Choose a degree." };

  const field = str("field", 80) || null;
  // A listed US school carries its domain from the autocomplete. An outside
  // institution (e.g. a certificate provider) does not, so resolve one so it
  // still gets a logo. Best-effort; null falls back to a monogram.
  let school_domain = str("school_domain", 255) || null;
  if (!school_domain && school) school_domain = await resolveInstitutionDomain(school);

  const start_date = toDate(str("start_month", 2), str("start_year", 4));
  const end_date = toDate(str("end_month", 2), str("end_year", 4));
  if (start_date && end_date && end_date < start_date) {
    return { error: "End date must be after the start date." };
  }

  const isCurrent = formData.get("is_current") === "on";

  const { error } = await supabase
    .from("education")
    .update({ school, degree, field, school_domain, start_date, end_date, is_current: isCurrent })
    .eq("id", id);
  if (error) return { error: "Could not update education. Try again." };

  await syncAcademicFromCurrentEducation(supabase, user.id);

  const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  revalidatePath("/profile/edit");
  if (prof?.username) revalidatePath(`/profile/${prof.username}`);

  return {};
}

// Delete one of the caller's own education entries. RLS (auth.uid() = user_id)
// enforces ownership; no need to re-check it here.
export async function deleteEducation(id: string): Promise<EducationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("education").delete().eq("id", id);
  if (error) return { error: "Could not delete education. Try again." };

  await syncAcademicFromCurrentEducation(supabase, user.id);

  const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  revalidatePath("/profile/edit");
  if (prof?.username) revalidatePath(`/profile/${prof.username}`);

  return {};
}

// Derive profiles.major / profiles.year / profile_school.school from the
// user's current education entry, since those inputs were removed from the
// profile form. "Current" = the entry with is_current = true (most recent by
// start_date among those); falls back to the most recent entry by start_date
// if none are marked current. No-op if the user has no education rows.
async function syncAcademicFromCurrentEducation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from("education")
    .select("school, field, start_date, end_date, is_current")
    .eq("user_id", userId)
    .order("start_date", { ascending: false, nullsFirst: false });
  if (!rows || rows.length === 0) return;

  const current = rows.find((r) => r.is_current) ?? rows[0];

  await supabase
    .from("profiles")
    .update({ major: current.field })
    .eq("id", userId);

  await supabase
    .from("profile_school")
    .upsert({ profile_id: userId, school: current.school }, { onConflict: "profile_id" });
}

// Byte-sniff for animation, no libraries. Each format is checked by its own
// container structure rather than trusting file extension/MIME alone.
function isAnimated(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/gif") return gifFrameCount(bytes) > 1;
  if (mime === "image/webp") return containsAscii(bytes, "ANIM");
  if (mime === "image/png") return containsAscii(bytes, "acTL");
  return false;
}

// GIF frames are each preceded by a Graphic Control Extension block
// (0x21 0xF9 0x04 ...). Static GIFs have at most one; animated GIFs have one
// per frame. Counting GCE blocks is simpler than walking the full block
// structure and is the standard heuristic for "is this GIF animated".
function gifFrameCount(bytes: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) count++;
  }
  return count;
}

// Plain substring search for a 4-byte ASCII chunk id (WebP RIFF "ANIM" chunk,
// PNG "acTL" chunk) anywhere in the file. Good enough — these tags don't
// occur incidentally in valid image data for the formats they gate.
function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const target = Array.from(needle, (c) => c.charCodeAt(0));
  outer: for (let i = 0; i <= bytes.length - target.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (bytes[i + j] !== target[j]) continue outer;
    }
    return true;
  }
  return false;
}
