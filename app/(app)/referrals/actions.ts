"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReferralCodeState = { error?: string; code?: string };

// Rename own referral code. set_referral_code (definer fn) lowercases + validates
// format and uniqueness; we just map its two known error messages to friendly text.
export async function updateReferralCode(
  _prev: ReferralCodeState,
  formData: FormData
): Promise<ReferralCodeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const raw = String(formData.get("code") ?? "").trim();
  if (!raw) return { error: "Enter a code." };

  const { data, error } = await supabase.rpc("set_referral_code", { p_code: raw });
  if (error) {
    if (error.message.includes("invalid_code"))
      return { error: "Use 3 to 20 letters, numbers, or underscores." };
    if (error.message.includes("code_taken")) return { error: "That code is taken." };
    return { error: "Could not update your code. Try again." };
  }

  revalidatePath("/referrals");
  return { code: data ?? raw };
}
