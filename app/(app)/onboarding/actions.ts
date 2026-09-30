"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";
import { parseStepsDone } from "@/lib/onboarding";
import { getPostHogServerClient } from "@/lib/posthog-server";

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

export async function finishOnboarding(stepsDoneRaw: unknown = []): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  getPostHogServerClient()?.capture({
    distinctId: user.id,
    event: "onboarding_completed",
    properties: { steps_done: parseStepsDone(stepsDoneRaw) },
  });
  redirect("/feed");
}
