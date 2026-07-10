"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled, generateText, modelForTier, type AiResult } from "@/lib/ai";
import { PROFILE_DRAFT_SYSTEM, PROFILE_NUDGE_SYSTEM } from "@/lib/ai-prompts";
import { isPro } from "@/lib/pro";
import { fallbackProfileNudge, getProfileGaps } from "@/lib/profile-completion";
import type { TablesUpdate } from "@/types/database.types";

const YEARS = ["freshman", "sophomore", "junior", "senior", "grad"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
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

  const yearRaw = str("year", 20);

  const updates: TablesUpdate<"profiles"> = {
    display_name: str("display_name", 50) || null,
    major: str("major", 100) || null,
    bio: str("bio", 500) || null,
    goals: str("goals", 500) || null,
    year: YEARS.includes(yearRaw) ? yearRaw : null,
  };

  // Trust boundary: never take the client's word for Pro status. Non-Pro
  // requests simply don't touch accent_color (a lapsed Pro keeps their color
  // until they next edit it).
  const { data: proRow } = await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single();
  if (isPro(proRow ?? { is_pro: false, pro_until: null })) {
    const accentRaw = str("accent_color", 7);
    updates.accent_color = HEX_COLOR.test(accentRaw) ? accentRaw : null;
  }

  const { error: pErr } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (pErr) return { error: "Could not save your profile. Try again." };

  const school = str("school", 100) || null;
  const { error: sErr } = await supabase
    .from("profile_school")
    .upsert({ profile_id: user.id, school }, { onConflict: "profile_id" });
  if (sErr) return { error: "Could not save your school. Try again." };

  // 1 pt for a profile update is awarded by the profiles_award_contribution
  // AFTER UPDATE trigger (fires only when a meaningful content field changed;
  // 7-day cooldown + dedupe live in the trigger) — nothing to call here.

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
      { model: modelForTier(pro), maxTokens: 100 },
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
    p?.display_name ? `name: ${p.display_name}` : "",
    p?.year ? `year: ${p.year}` : "",
    p?.major ? `major: ${p.major}` : "",
    schoolRow?.school ? `school: ${schoolRow.school}` : "",
  ].filter(Boolean).join("\n");

  const raw = await generateText(PROFILE_DRAFT_SYSTEM, `Facts:\n${facts || "(no facts yet)"}`, { model: modelForTier(pro), maxTokens: 220 });
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
