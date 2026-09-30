"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EditState } from "@/app/(app)/profile/edit/actions";
import { consentWrite, parseOnboardingSource, parseStepsDone } from "@/lib/onboarding";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { getOwnerSettings, parseOpenTo, saveOwnerSettings } from "@/lib/portfolio/owner";
import { parseFocusAreas, parseStage } from "@/lib/stage";
import { rememberStageMoment } from "@/lib/stage-moment";

// Step 2 shows display name and bio only, so it writes only those two
// (the full Edit profile action would also clear goals and a Pro theme).
export async function saveOnboardingBasics(_prev: EditState, formData: FormData): Promise<EditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  const str = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: str("display_name", 50) || null, bio: str("bio", 500) || null })
    .eq("id", user.id);
  if (error) return { error: "Could not save your profile. Try again." };
  getPostHogServerClient()?.capture({ distinctId: user.id, event: "profile_updated" });
  return {};
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

  const { data: before } = await supabase.from("profiles").select("stage").eq("id", user.id).maybeSingle();
  const { error } = await supabase
    .from("profiles")
    .update({ stage, focus_areas: focus.data, open_to: openTo.data })
    .eq("id", user.id);
  if (error) return { error: "Could not save. Try again." };
  await rememberStageMoment(before?.stage ?? null, stage);

  getPostHogServerClient()?.capture({
    distinctId: user.id,
    event: "stage_set",
    properties: { stage, focus_count: focus.data.length, source: "onboarding" },
  });
  return {};
}

// Final onboarding step. The box starts from what is saved (pre-checked only
// before the first decision, see onboardingPrefill); this writes only when the
// box differs from the saved state, and only the four consent sections.
export async function savePortfolioConsent(_prev: EditState, formData: FormData): Promise<EditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  const failed = { error: "Could not save this. You can change it later in Edit profile." };
  const current = await getOwnerSettings(supabase, user.id);
  if (!current.ok) return failed;
  const next = consentWrite(current.data, formData.get("publish_portfolio") === "on");
  if (!next) return {};
  const { data: profile } = await supabase.from("profiles").select("is_private").eq("id", user.id).maybeSingle();
  // sectionOrder undefined keeps the saved order, so isPro is never consulted.
  const saved = await saveOwnerSettings(supabase, user.id, next, undefined, {
    isPrivate: profile?.is_private ?? false,
    isPro: false,
  });
  return saved.ok ? {} : failed;
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

// Called once when the wizard mounts. Marks the one-time /feed redirect as used
// (only while onboarded_at is null) and records how the user got here.
export async function startOnboarding(sourceRaw: unknown): Promise<void> {
  const source = parseOnboardingSource(sourceRaw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("onboarded_at", null);
  getPostHogServerClient()?.capture({ distinctId: user.id, event: "onboarding_started", properties: { source } });
}
