"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function startPathTask(taskId: string): Promise<{ error?: string }> {
  if (!taskId) return { error: "Task is missing." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to update your path." };

  const { error } = await supabase
    .from("path_tasks")
    .update({ status: "doing", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", user.id)
    .eq("status", "todo");

  if (error) return { error: "Could not start this task." };
  revalidatePath("/home");
  return {};
}
