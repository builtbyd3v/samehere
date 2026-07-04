"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead() {
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
  revalidatePath("/", "layout");
}
