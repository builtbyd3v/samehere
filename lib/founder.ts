import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// get_founder_spots_left does a `count(*) where is_founder` full table scan on
// profiles, uncached, on every anonymous load of `/` and `/signup` — the two
// highest-traffic pages. The RPC is granted to anon and has no auth-dependent
// logic, so its result is identical for every viewer — safe to share one cache
// entry across all requests (same pattern as getCachedLeaderboard).
// ponytail: 5min TTL — "spots left out of 100" tolerates a few minutes of
// staleness fine, but an hour risks showing "spots left" after the cap fills.
const fetchFounderSpotsLeft = unstable_cache(
  async () => {
    const supabase = await createClient();
    // Cast the client (not a detached method — that would drop `this`); the RPC
    // isn't in generated types until types are regenerated.
    const { data, error } = await (
      supabase as unknown as {
        rpc: (fn: string) => Promise<{ data: number | null; error: unknown }>;
      }
    ).rpc("get_founder_spots_left");
    if (!error && typeof data === "number") return data;
    return null;
  },
  ["founder-spots-left"],
  { revalidate: 300 }
);

/** Live count of remaining Founder spots (first 100). Returns undefined when the
 *  public RPC isn't reachable, so callers fall back to static copy. */
export async function getFounderSpotsLeft(): Promise<number | undefined> {
  try {
    const data = await fetchFounderSpotsLeft();
    if (typeof data === "number") return data;
  } catch {
    // RPC unavailable — caller keeps static framing.
  }
  return undefined;
}
