import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfilePreview = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  year: string | null;
  major: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  profile_school: { school: string | null } | null;
};

export type MentionSuggestion = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
};

const PREVIEW_SELECT =
  "username, display_name, avatar_url, bio, year, major, is_pro, is_founder, is_campus_founder, profile_school(school)";

// ponytail: per-instance cache, no TTL; staleness bounded by serverless recycle
const cache = new Map<string, ProfilePreview | null>();

export async function fetchProfilePreview(
  supabase: SupabaseClient,
  username: string,
): Promise<ProfilePreview | null> {
  const key = username.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const { data } = await supabase
    .from("profiles")
    .select(PREVIEW_SELECT)
    .eq("username", username)
    .maybeSingle();

  const profile = (data as ProfilePreview | null) ?? null;
  cache.set(key, profile);
  return profile;
}

export async function searchMentionUsers(
  supabase: SupabaseClient,
  query: string,
): Promise<MentionSuggestion[]> {
  const q = query.replace(/[^a-z0-9_]/gi, "").toLowerCase();
  if (!q) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, is_pro, is_founder, is_campus_founder")
      .order("created_at", { ascending: false })
      .limit(5);
    return (data as MentionSuggestion[]) ?? [];
  }

  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, is_pro, is_founder, is_campus_founder")
    .or(`username.ilike.${q}%,display_name.ilike.%${q}%`)
    .limit(6);

  return (data as MentionSuggestion[]) ?? [];
}
