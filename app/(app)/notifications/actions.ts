"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead() {
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
  revalidatePath("/", "layout");
}

export async function getNotificationUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_notification_unread_total");
  return Number(data ?? 0);
}
