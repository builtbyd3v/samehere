"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PrivacyState = { error?: string; success?: boolean };

// Updates ONLY the three privacy prefs, moved here from profile/edit. Same
// owner-write RLS as the rest of profiles — no service_role.
export async function updatePrivacy(_prev: PrivacyState, formData: FormData): Promise<PrivacyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const hvRaw = String(formData.get("heatmap_visibility") ?? "").trim();
  const updates = {
    is_private: formData.get("is_private") === "on",
    hide_school: formData.get("hide_school") === "on",
    heatmap_visibility: hvRaw === "followers" ? "followers" : "public",
    leaderboard_opt_out: formData.get("show_on_leaderboard") !== "on",
  };

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: "Could not save your settings. Try again." };

  revalidatePath("/settings");
  return { success: true };
}

// Plain RLS delete, scoped to the caller's own blocker_id — block-create +
// follow-cleanup lands in a later step.
export async function unblockUser(blockedId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", blockedId);
  revalidatePath("/settings");
}
