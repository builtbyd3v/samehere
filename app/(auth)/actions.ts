"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { usernameError } from "@/lib/utils/validation";

// Shared shape for useActionState on the auth forms.
export type AuthState = { error?: string; ok?: boolean; email?: string };

// Signup: any email works (no .edu gate — see docs/superpowers/specs/2026-07-09-open-signup-design.md).
// A .edu address auto-earns the Verified Student badge server-side (handle_new_user trigger).
// The handle_new_user trigger claims profiles.username from user_metadata, so
// username MUST be valid + unique here or the DB rejects the whole signup.
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const refCode = String(formData.get("ref_code") ?? "").trim().toLowerCase();

  if (!email) return { error: "Enter your email address." };
  const uErr = usernameError(username);
  if (uErr) return { error: uErr };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  // Prefer the configured site URL over the request Origin header (which the
  // client controls) for the confirmation link. Supabase's redirect allowlist
  // is the real guard; this is defense in depth.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin") || "";

  // DB-backed signup rate limit (Supabase Auth's own limiter is IP-blind across
  // its own window; this adds a per-IP cap). x-forwarded-for's first hop is the
  // client IP behind Vercel's proxy. Fail-open on any rpc error — a limiter
  // outage should never block signup.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const { data: allowed, error: rlError } = await supabase.rpc("rl_check_signup", {
    p_ip_hash: ipHash,
  });
  if (rlError) {
    console.error("rl_check_signup failed, failing open:", rlError);
  } else if (allowed === false) {
    return { error: "Too many signups. Try again later." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // read by the handle_new_user trigger; ref_code is optional attribution,
      // never blocks signup if it's empty or turns out invalid
      data: refCode ? { username, ref_code: refCode } : { username },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    // Map the real failure instead of always blaming the username. The trigger's
    // unique-username violation surfaces as a 500 "Database error saving new user";
    // duplicate email and rate limits come back with their own codes/status.
    const code = error.code ?? "";
    if (code.includes("rate_limit") || error.status === 429)
      return { error: "Too many attempts. Wait a minute and try again." };
    if (code === "user_already_exists" || code === "email_exists")
      return { error: "An account with that email already exists. Log in or reset your password." };
    if (error.status === 500 || /database error/i.test(error.message))
      return { error: "That username is taken. Try another." };
    return { error: "Couldn't create your account. Try again in a moment." };
  }

  return { ok: true, email };
}

// Login: email + password. On success redirects to the app home; the redirect
// throws a control-flow exception, so nothing after it runs. Errors are kept
// vague to avoid leaking which accounts exist, except the "confirm your email"
// case, which is actionable.
export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return { error: "Confirm your email first, check your inbox for the link." };
    return { error: "Invalid email or password." };
  }

  redirect("/feed");
}

// Sign out and return to login. Used as a <form action> in the navbar.
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
