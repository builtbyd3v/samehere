"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";
import { parseStepsDone } from "@/lib/onboarding";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { getOwnerSettings, parsePublishFlags, saveOwnerSettings } from "@/lib/portfolio/owner";

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

// Final onboarding step. Consent only: runs when the student leaves the
// pre-checked box on. Turns on intro, projects, experience, education and
// keeps every other flag and the section order the student already has
// (onboarding is revisitable from the feed checklist).
export async function savePortfolioConsent(_prev: EditState, formData: FormData): Promise<EditState> {
  if (formData.get("publish_portfolio") !== "on") return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  const current = await getOwnerSettings(supabase, user.id);
  if (!current.ok) return { error: "Could not publish your portfolio. You can do it later in Edit profile." };
  const flags = parsePublishFlags({
    publish_intro: true,
    publish_projects: true,
    publish_experience: true,
    publish_education: true,
    publish_activity: current.data.publish_activity,
    publish_posts: current.data.publish_posts,
    allow_indexing: current.data.allow_indexing,
  });
  if (!flags.ok) return { error: "Could not publish your portfolio. You can do it later in Edit profile." };
  const { data: profile } = await supabase.from("profiles").select("is_private").eq("id", user.id).maybeSingle();
  // sectionOrder undefined keeps the saved order, so isPro is never consulted.
  const saved = await saveOwnerSettings(supabase, user.id, flags.data, undefined, {
    isPrivate: profile?.is_private ?? false,
    isPro: false,
  });
  if (!saved.ok) return { error: "Could not publish your portfolio. You can do it later in Edit profile." };
  return {};
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
