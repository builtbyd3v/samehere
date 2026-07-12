import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type FeedPost } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";
import { TEXT_LIMITS } from "@/lib/utils/validation";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ClubResult = {
  id: string;
  slug: string;
  name: string;
  purpose: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

// Same sanitizer as searchProfiles/peopleSearch: strips PostgREST-unsafe chars,
// then allowlists [a-z0-9] per token so nothing user-typed reaches .or() raw.
export function tokensFor(q: string): string[] {
  const safe = q.replace(/[,()*%\\]/g, "").trim().slice(0, TEXT_LIMITS.searchQuery);
  return safe
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean)
    .slice(0, 8);
}

// ponytail: ilike scan, add tsvector GIN + websearch_to_tsquery if search gets slow/needs ranking
export async function searchPosts(supabase: SupabaseServer, tokens: string[], limit: number): Promise<FeedPost[]> {
  if (!tokens.length) return [];
  const orFilter = tokens.map((t) => `content.ilike.%${t}%`).join(",");
  const [{ data }, { data: blockedIds }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).or(orFilter).order("created_at", { ascending: false }).limit(limit).returns<FeedPost[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const filtered = (data ?? []).filter((p) => !blocked.has(p.user_id));
  return filtered.length ? attachSignedMedia(supabase, filtered) : [];
}

// ponytail: ilike scan, add tsvector GIN + websearch_to_tsquery if search gets slow/needs ranking
export async function searchClubs(supabase: SupabaseServer, tokens: string[], limit: number): Promise<ClubResult[]> {
  if (!tokens.length) return [];
  const orFilter = tokens.map((t) => `name.ilike.%${t}%,purpose.ilike.%${t}%`).join(",");
  const { data } = await supabase
    .from("clubs")
    .select("id, slug, name, purpose, avatar_url, is_verified")
    .or(orFilter)
    .limit(limit)
    .returns<ClubResult[]>();
  return data ?? [];
}
