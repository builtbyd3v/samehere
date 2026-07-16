"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// All mutations are also gated inside the DB functions (current_is_admin ->
// raise 'not authorized'); this early check just avoids a thrown error for
// non-admins and keeps the surface honest.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("current_is_admin");
  if (!isAdmin) redirect("/feed");
  return supabase;
}

export async function hidePost(postId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_hide_post", { p_post_id: postId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function unhidePost(postId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_unhide_post", { p_post_id: postId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// Hard delete: admin_delete_post already checked current_is_admin() and did
// the actual row delete (with cascades) before returning here, so the DB
// side is done and irreversible regardless of what happens below. Storage
// RLS on post-media is owner-keyed, so removing another user's objects
// needs the admin (service-role) client -- sanctioned use documented in
// lib/supabase/admin.ts (admin-gated RPC already authorized the delete,
// admin-chosen target, storage RLS cannot express this). A storage failure
// must not be swallowed as success: the post row is gone either way, but
// the caller needs to know if orphaned media objects remain.
export async function deletePost(postId: string) {
  const supabase = await requireAdmin();
  const { data: paths, error } = await supabase.rpc("admin_delete_post", { p_post_id: postId });
  if (error) throw new Error(error.message);
  if (paths && paths.length > 0) {
    const admin = createAdminClient();
    const { error: storageError } = await admin.storage.from("post-media").remove(paths);
    if (storageError) {
      revalidatePath("/admin");
      throw new Error(`Post deleted, but media cleanup failed: ${storageError.message}`);
    }
  }
  revalidatePath("/admin");
}

export async function resolveReport(reportId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: reportId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function resolveFeedback(feedbackId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_resolve_feedback", { p_feedback_id: feedbackId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function suspendUser(userId: string, postId?: string | null) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_suspend_user", { p_user: userId, p_post_id: postId ?? null });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function unsuspendUser(userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_unsuspend_user", { p_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
