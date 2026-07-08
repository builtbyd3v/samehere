import { createClient } from "@/lib/supabase/server";

/** Live count of remaining Founder spots (first 100). Returns undefined when the
 *  public RPC isn't reachable, so callers fall back to static copy. */
export async function getFounderSpotsLeft(): Promise<number | undefined> {
  try {
    const supabase = await createClient();
    // Cast the client (not a detached method — that would drop `this`); the RPC
    // isn't in generated types until types are regenerated.
    const { data, error } = await (
      supabase as unknown as {
        rpc: (fn: string) => Promise<{ data: number | null; error: unknown }>;
      }
    ).rpc("get_founder_spots_left");
    if (!error && typeof data === "number") return data;
  } catch {
    // RPC unavailable — caller keeps static framing.
  }
  return undefined;
}
