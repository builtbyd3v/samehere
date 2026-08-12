"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, type EditState } from "@/app/(app)/profile/edit/actions";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { INTAKE_DIAGNOSIS_SYSTEM, untrusted } from "@/lib/ai-prompts";
import {
  heuristicDiagnosis,
  intakeUserPrompt,
  isPathStage,
  isPathTimeline,
  parseDiagnosisJson,
  type DiagnosisResult,
  type IntakeAnswers,
} from "@/lib/path/diagnose";
import { CONSTRAINT_VALUES } from "@/lib/path/intake-options";
import { isPro } from "@/lib/pro";
import type { Json } from "@/types/database.types";

// `updateProfile` (profile/edit/actions.ts — peer-owned, imported not edited)
// always calls redirect(`/profile/${username}`) on success. That's correct for
// the standalone edit-profile page, but here it would bounce the viewer out of
// the wizard before later steps. Next's redirect() works by throwing an error
// tagged with a `NEXT_REDIRECT`-prefixed `digest`; we catch only that specific
// signal and treat it as success, letting the wizard advance on the client.
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
  redirect("/home");
}

export type PathIntakeState = {
  error?: string;
  overCap?: boolean;
};

function splitList(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseIntakeForm(formData: FormData): IntakeAnswers | { error: string } {
  const stageRaw = String(formData.get("stage") ?? "").trim();
  const timelineRaw = String(formData.get("timeline") ?? "").trim();
  if (!isPathStage(stageRaw)) return { error: "Pick where you are in the process." };
  if (!isPathTimeline(timelineRaw)) return { error: "Pick a timeline." };

  const constraints = formData
    .getAll("constraints")
    .map((v) => String(v))
    .filter((c) => CONSTRAINT_VALUES.has(c));

  const blocker = String(formData.get("blocker") ?? "").trim().slice(0, 400);
  if (!blocker) return { error: "Name the main thing blocking you right now." };

  const resume = String(formData.get("resume_or_projects") ?? "").trim().slice(0, 2000);

  return {
    stage: stageRaw,
    timeline: timelineRaw,
    constraints,
    target_roles: splitList(String(formData.get("target_roles") ?? "")).map((s) => s.slice(0, 80)),
    target_companies: splitList(String(formData.get("target_companies") ?? "")).map((s) =>
      s.slice(0, 80),
    ),
    blocker,
    resume_or_projects: resume || undefined,
  };
}

async function runDiagnosis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  intake: IntakeAnswers,
  pro: boolean,
): Promise<{ result: DiagnosisResult } | { overCap: true }> {
  if (!aiEnabled()) {
    return { result: heuristicDiagnosis(intake) };
  }

  const { data: allowed } = await supabase.rpc("use_ai_quota", { p_kind: "intake_diagnosis" });
  if (!allowed) {
    // Free: clear upsell. Pro at the abuse ceiling: still finish via heuristic.
    if (!pro) return { overCap: true };
    return { result: heuristicDiagnosis(intake) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("major, year, profile_school(school)")
    .eq("id", userId)
    .maybeSingle();

  const school = profile?.profile_school?.school ?? undefined;

  const prompt = intakeUserPrompt({
    stage: untrusted(intake.stage),
    timeline: untrusted(intake.timeline),
    constraints: untrusted(intake.constraints.join(", ") || "none"),
    target_roles: untrusted(intake.target_roles.join(", ") || "none"),
    target_companies: untrusted(intake.target_companies.join(", ") || "none"),
    blocker: untrusted(intake.blocker),
    resume_or_projects: untrusted(intake.resume_or_projects ?? "none"),
    major: profile?.major ? untrusted(profile.major) : undefined,
    year: profile?.year ? untrusted(profile.year) : undefined,
    school: school ? untrusted(school) : undefined,
  });

  const raw = await generateText(INTAKE_DIAGNOSIS_SYSTEM, prompt, {
    model: modelForTier(pro),
    maxTokens: 900,
    temperature: 0.3,
  });

  return { result: parseDiagnosisJson(raw, intake) };
}

/**
 * Struggle-aware intake → AI diagnosis → learner_profiles + path_plans +
 * path_tasks (+ optional user_projects). Sets onboarded_at and redirects /home.
 */
export async function submitPathIntake(
  _prev: PathIntakeState,
  formData: FormData,
): Promise<PathIntakeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseIntakeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, pro_until, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  const pro = isPro(profile);
  const diagnosed = await runDiagnosis(supabase, user.id, parsed, pro);
  if ("overCap" in diagnosed) return { overCap: true };

  const { result } = diagnosed;

  const { data: latest } = await supabase
    .from("intake_responses")
    .select("version")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (latest?.version ?? 0) + 1;

  const answers = {
    stage: parsed.stage,
    constraints: parsed.constraints,
    target_roles: parsed.target_roles,
    target_companies: parsed.target_companies,
    timeline: parsed.timeline,
    blocker: parsed.blocker,
    resume_or_projects: parsed.resume_or_projects ?? null,
  } satisfies Record<string, unknown>;

  const { data: intakeRow, error: intakeErr } = await supabase
    .from("intake_responses")
    .insert({
      user_id: user.id,
      version: nextVersion,
      answers: answers as Json,
    })
    .select("id")
    .single();
  if (intakeErr || !intakeRow) {
    return { error: "Could not save your intake. Try again." };
  }

  let skillTrackId: string | null = result.skill_track_id ?? null;
  if (skillTrackId) {
    const { data: track } = await supabase
      .from("skill_tracks")
      .select("id")
      .eq("id", skillTrackId)
      .maybeSingle();
    if (!track) skillTrackId = null;
  }

  const { error: learnerErr } = await supabase.from("learner_profiles").upsert(
    {
      user_id: user.id,
      version: nextVersion,
      diagnosis: result.diagnosis as Json,
      skill_track_id: skillTrackId,
      skill_stage_id: result.skill_stage_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (learnerErr) {
    return { error: "Could not save your diagnosis. Try again." };
  }

  const { error: planErr } = await supabase.from("path_plans").upsert(
    {
      user_id: user.id,
      ui: result.ui as unknown as Json,
      rationale: result.ui.why,
      source_intake_id: intakeRow.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (planErr) {
    return { error: "Could not save your path. Try again." };
  }

  // Replace open tasks from prior diagnoses so re-intake stays clean.
  await supabase
    .from("path_tasks")
    .delete()
    .eq("user_id", user.id)
    .in("status", ["todo", "doing"]);

  if (result.tasks.length > 0) {
    const rows = result.tasks.map((t, i) => ({
      user_id: user.id,
      module_id: t.module_id,
      title: t.title,
      detail: t.detail ?? null,
      status: "todo",
      sort_index: i,
    }));
    // Plan already saved — don't block onboarding on task insert failure.
    await supabase.from("path_tasks").insert(rows);
  }

  if (result.project_slug) {
    const { data: project } = await supabase
      .from("path_projects")
      .select("slug")
      .eq("slug", result.project_slug)
      .eq("published", true)
      .maybeSingle();
    if (project) {
      const { data: existing } = await supabase
        .from("user_projects")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_slug", project.slug)
        .maybeSingle();
      if (!existing) {
        await supabase.from("user_projects").insert({
          user_id: user.id,
          project_slug: project.slug,
          status: "assigned",
          checklist_state: {},
        });
      }
    }
  }

  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  redirect("/home");
}
