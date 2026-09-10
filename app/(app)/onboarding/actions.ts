"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";

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
    if (isRedirectSignal(err)) return {};
    throw err;
  }
}

export async function finishOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  redirect("/feed");
}

export type OnboardingMatch = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
  year: string | null;
  major: string | null;
  reason: string | null;
};

export async function getOnboardingMatches(): Promise<OnboardingMatch[]> {
  return [];
}
