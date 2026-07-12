import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Viewer's DM + notification unread totals, fetched once per request. `cache()`
// dedupes across every consumer in one render pass (LeftNav badges and the tab
// title both call this — one pair of RPCs, not two). Both RPCs self-guard on
// auth.uid() being null (return 0), so no session check is needed here.
export const getUnreadCounts = cache(async (): Promise<{ dm: number; notif: number }> => {
  const supabase = await createClient();
  const [{ data: dm }, { data: notif }] = await Promise.all([
    supabase.rpc("get_dm_unread_total"),
    supabase.rpc("get_notification_unread_total"),
  ]);
  return { dm: Number(dm ?? 0), notif: Number(notif ?? 0) };
});
