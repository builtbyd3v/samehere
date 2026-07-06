"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function resolveReport(reportId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: reportId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function suspendUser(userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_suspend_user", { p_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function unsuspendUser(userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_unsuspend_user", { p_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
