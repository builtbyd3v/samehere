"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";

// `updateProfile` (profile/edit/actions.ts — peer-owned, imported not edited)
// always calls redirect(`/profile/${username}`) on success. That's correct for
// the standalone edit-profile page, but here it would bounce the viewer out of
// the wizard before steps 2/3. Next's redirect() works by throwing an error
// tagged with a `NEXT_REDIRECT`-prefixed `digest`; we catch only that specific
// signal and treat it as success, letting the wizard advance to the next step
// on the client instead of navigating away. Any other thrown error rethrows.
function isRedirectSignal(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function saveOnboardingBasics(prev: EditState, formData: FormData): Promise<EditState> {
  try {
    return await updateProfile(prev, formData);
  } catch (err) {
    if (isRedirectSignal(err)) return {}; // updateProfile succeeded; its own redirect is swallowed here
    throw err;
  }
}

// Own-row update — RLS "owner write" policy on profiles already covers this
// (see Security Requirements #5 in CLAUDE.md), no new definer function needed.
export async function finishOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  redirect("/feed");
}
