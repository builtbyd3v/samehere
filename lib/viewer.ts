import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Request-scoped viewer auth + profile reads, deduped across every server
// component in one render pass - same pattern as lib/unread.ts's
// getUnreadCounts(). Do NOT wrap lib/supabase/server.ts's createClient
// itself in cache(): server actions/route handlers that mutate cookies need
// a fresh client every call. This only memoizes the read-only helpers below.
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

// Union of every column any /feed surface currently selects for the viewer's
// own profile row (verified against app/(app)/layout.tsx,
// app/(app)/feed/page.tsx, app/(app)/feed/LeftRail.tsx,
// app/(app)/feed/RightRail.tsx - this exact string is RightRail.tsx's
// existing select, already a superset of the other three).
const VIEWER_PROFILE_SELECT =
  "username, display_name, avatar_url, is_pro, verified_student, is_founder, is_campus_founder, profile_school(school), year, major, goals, bio, pro_until, profile_theme";

export const getViewerProfile = cache(async () => {
  const { supabase, user } = await getViewer();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select(VIEWER_PROFILE_SELECT)
    .eq("id", user.id)
    .single();
  return data;
});

export const getViewerProfileCounts = cache(async () => {
  const { supabase, user } = await getViewer();
  if (!user) return null;
  const { data } = await supabase.rpc("get_profile_counts", { p_profile_id: user.id });
  return data?.[0] ?? { posts: 0, followers: 0, following: 0 };
});
