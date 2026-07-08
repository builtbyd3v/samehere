import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type LeaderboardRow = Database["public"]["Functions"]["get_leaderboard"]["Returns"][number];

// get_leaderboard does a full contribution_log scan on every call. Ranking
// only moves ~once/day, so cache the RPC result per (scope, school) for an
// hour instead of recomputing on every page view. The RPC's only per-viewer
// behavior is "must be authenticated" (auth.uid() is null check) — the rows
// themselves are identical for every viewer of the same scope+school, so one
// cache entry safely serves everyone. Per-user bits (e.g. "is this me") stay
// out of this cache and get computed at render time in the page.
export async function getCachedLeaderboard(
  supabase: SupabaseClient<Database>,
  scope: "global" | "school",
  school: string | null
): Promise<LeaderboardRow[]> {
  const fetchLeaderboard = unstable_cache(
    async () => {
      const { data } = await supabase.rpc("get_leaderboard", {
        p_scope: scope,
        p_school: scope === "school" ? school ?? undefined : undefined,
      });
      return data ?? [];
    },
    ["leaderboard", scope, school ?? ""],
    { revalidate: 3600 }
  );
  return fetchLeaderboard();
}
