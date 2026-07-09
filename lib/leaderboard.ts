import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type LeaderboardRow = Database["public"]["Functions"]["get_leaderboard"]["Returns"][number];

// get_leaderboard does a full contribution_log scan on every call. Ranking
// only moves ~once/day, so cache the global RPC result for an hour instead of
// recomputing on every page view. The RPC's only per-viewer behavior is "must
// be authenticated" (auth.uid() is null check) — global rows are identical
// for every viewer, so one cache entry safely serves everyone; whichever
// user's request happens to miss the cache "lends" its session to satisfy the
// auth check for all subsequent readers of that entry. The supabase client is
// created outside this module (cookies() already resolved) and only its
// already-authenticated .rpc() call runs inside the cache callback — no
// cookies()/session read happens inside unstable_cache itself.
export async function getCachedLeaderboard(
  supabase: SupabaseClient<Database>
): Promise<LeaderboardRow[]> {
  const fetchLeaderboard = unstable_cache(
    async () => {
      const { data } = await supabase.rpc("get_leaderboard", { p_scope: "global" });
      return data ?? [];
    },
    ["leaderboard", "global"],
    { revalidate: 3600 }
  );
  return fetchLeaderboard();
}

// peers is per-viewer (mutual follows), can't share a cache across users.
// ponytail: peers uncached; bounded by mutual count.
export async function getPeersLeaderboard(
  supabase: SupabaseClient<Database>
): Promise<LeaderboardRow[]> {
  const { data } = await supabase.rpc("get_leaderboard", { p_scope: "peers" });
  return data ?? [];
}
