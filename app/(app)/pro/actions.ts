"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Sets the signed-in user's wants_pro flag. Session client under RLS — no
// service_role, no billing (v1.1 wires Stripe on top of this flag).
export async function joinProWaitlist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ wants_pro: true }).eq("id", user.id);
  revalidatePath("/pro");
}
