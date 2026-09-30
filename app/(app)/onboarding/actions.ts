"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";
import { parseStepsDone } from "@/lib/onboarding";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { getOwnerSettings, parseOpenTo, parsePublishFlags, saveOwnerSettings } from "@/lib/portfolio/owner";
import { parseFocusAreas, parseStage } from "@/lib/stage";

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

// First onboarding step: stage is required to continue; focus and open_to are optional.
export async function saveOnboardingStage(_prev: EditState, formData: FormData): Promise<EditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const stage = parseStage(formData.get("stage"));
  if (!stage) return { error: "Pick where you're at to continue." };
  const focus = parseFocusAreas(formData.getAll("focus_areas"));
  if (!focus.ok) return { error: focus.error };
  const openTo = parseOpenTo(formData.getAll("open_to"));
  if (!openTo.ok) return { error: openTo.unavailable ? openTo.message : openTo.error };

  const { error } = await supabase
    .from("profiles")
    .update({ stage, focus_areas: focus.data, open_to: openTo.data })
    .eq("id", user.id);
  if (error) return { error: "Could not save. Try again." };

  getPostHogServerClient()?.capture({
    distinctId: user.id,
    event: "stage_set",
    properties: { stage, focus_count: focus.data.length, source: "onboarding" },
  });
  return {};
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
