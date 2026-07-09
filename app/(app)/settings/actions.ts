"use server";

import { randomInt, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

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

export type VerificationState = { error?: string; success?: boolean };

// Friendly text for the exception messages request_school_verification raises
// (see supabase/migrations/20260713110000_school_email_verification.sql).
function friendlyRequestError(message: string): string {
  if (message.includes("must be a .edu")) return "Must be a .edu email address.";
  if (message.includes("already verified")) return "You're already a verified student.";
  if (message.includes("too many verification requests")) return "Too many requests. Try again later.";
  return "Could not send a code. Check your email and try again.";
}

// Step 1: generate a 6-digit code, hash it (plain code never touches the DB),
// let the RPC validate + rate-limit + store it, then email the plain code.
export async function requestSchoolVerification(_prev: VerificationState, formData: FormData): Promise<VerificationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your school email." };

  const code = randomInt(100000, 1000000).toString();
  const codeHash = createHash("sha256").update(code).digest("hex");

  const { error } = await supabase.rpc("request_school_verification", { p_email: email, p_code_hash: codeHash });
  if (error) return { error: friendlyRequestError(error.message) };

  // Code row is already stored — an email failure here is harmless (the user
  // can request a new code, which overwrites it).
  try {
    await sendEmail({
      to: email,
      subject: "Your samehere verification code",
      text: `Your samehere verification code is ${code}. It expires in 15 minutes.`,
    });
  } catch {
    return { error: "Could not send the email. Try requesting a new code." };
  }

  return { success: true };
}

// Step 2: confirm_school_verification returns false for wrong/expired/no code
// (not an exception), and raises only for the too-many-attempts cap.
export async function confirmSchoolVerification(_prev: VerificationState, formData: FormData): Promise<VerificationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter the code." };

  const { data, error } = await supabase.rpc("confirm_school_verification", { p_code: code });
  if (error) return { error: error.message };
  if (!data) return { error: "Wrong or expired code." };

  revalidatePath("/settings");
  return { success: true };
}
