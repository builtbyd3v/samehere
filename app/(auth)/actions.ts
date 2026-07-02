"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isEduEmail, usernameError } from "@/lib/utils/validation";

// Shared shape for useActionState on the auth forms.
export type AuthState = { error?: string; ok?: boolean; email?: string };

// Signup: server-side gate on .edu + username + password, then Supabase creates
// the user and (with email confirmations on) sends a confirmation link.
// The handle_new_user trigger claims profiles.username from user_metadata, so
// username MUST be valid + unique here or the DB rejects the whole signup.
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  // Never trust the client — the .edu gate and minimums are enforced here, server-side.
  if (!isEduEmail(email)) return { error: "Enter a valid .edu school email address." };
  const uErr = usernameError(username);
  if (uErr) return { error: uErr };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }, // read by the handle_new_user trigger
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    // We already validated charset/reserved/.edu/length, so a failure here is
    // almost always a taken username (the trigger's unique violation surfaces as
    // a generic "Database error saving new user"). Duplicate *emails* don't error —
    // Supabase silently resends to prevent enumeration.
    // ponytail: coarse mapping; add a username_available RPC if signups get confusing.
    return { error: "That username may already be taken. Try another." };
  }

  return { ok: true, email };
}
