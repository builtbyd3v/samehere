import type { SupabaseClient } from "@supabase/supabase-js";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { REDIAGNOSIS_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { isPro } from "@/lib/pro";
import type { Database, Json } from "@/types/database.types";
import {
  heuristicDiagnosis,
  isPathStage,
  isPathTimeline,
  parseDiagnosisJson,
  type DiagnosisResult,
  type IntakeAnswers,
  type PathTimeline,
} from "./diagnose";
import { fixtureForRecipe } from "./fixtures";
import type { PathStage, UiRecipe } from "./types";

type DbClient = SupabaseClient<Database>;

export type RediagnoseOpts = {
  reason: string;
  force?: boolean;
  /** Optional blocker note from manual "something changed". */
  blockerNote?: string;
};

export type RediagnoseOk = {
  ok: true;
  mode: "ai" | "heuristic";
  recipe: UiRecipe;
};

export type RediagnoseFail = {
  ok: false;
  reason: "no_context" | "over_cap" | "write_failed";
};

export type RediagnoseOutcome = RediagnoseOk | RediagnoseFail;

const INTERVIEW_REASONS = new Set([
  "application_status_oa",
  "application_status_interview",
  "status_oa",
  "status_interview",
]);

function isInterviewFlipReason(reason: string): boolean {
  return INTERVIEW_REASONS.has(reason);
}

function stringList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 80))
    .slice(0, max);
}

/** Narrow intake_responses.answers JSON into IntakeAnswers when possible. */
export function intakeFromAnswersJson(raw: unknown): IntakeAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isPathStage(row.stage)) return null;
  if (!isPathTimeline(row.timeline)) return null;
  const blocker = typeof row.blocker === "string" ? row.blocker.trim() : "";
  if (!blocker) return null;
  return {
    stage: row.stage,
    timeline: row.timeline,
    constraints: stringList(row.constraints, 16),
    target_roles: stringList(row.target_roles),
    target_companies: stringList(row.target_companies),
    blocker: blocker.slice(0, 400),
    resume_or_projects:
      typeof row.resume_or_projects === "string" && row.resume_or_projects.trim()
        ? row.resume_or_projects.trim().slice(0, 2000)
        : undefined,
  };
}

/**
 * Deterministic recipe switch when an application hits oa/interview.
 * Forces interviewing stage → prep_room via heuristicDiagnosis.
 */
export function heuristicInterviewFlip(intake: IntakeAnswers): DiagnosisResult {
  return heuristicDiagnosis({
    ...intake,
    stage: "interviewing",
    blocker: intake.blocker.trim() || "Interview or OA on the calendar",
  });
}

/** Whether applications include oa/interview (auto flip signal). */
export function applicationsNeedPrepRoom(
  statuses: readonly string[],
): boolean {
  return statuses.some((s) => s === "oa" || s === "interview");
}

function rediagnosisUserPrompt(input: {
  reason: string;
  intake: IntakeAnswers;
  priorDiagnosis: unknown;
  priorRecipe: string | null;
  applicationSummary: string;
  projectsSummary: string;
}): string {
  return [
    `reason: ${untrusted(input.reason)}`,
    `stage: ${untrusted(input.intake.stage)}`,
    `timeline: ${untrusted(input.intake.timeline)}`,
    `constraints: ${untrusted(input.intake.constraints.join(", ") || "none")}`,
    `target_roles: ${untrusted(input.intake.target_roles.join(", ") || "none")}`,
    `target_companies: ${untrusted(input.intake.target_companies.join(", ") || "none")}`,
    `blocker: ${untrusted(input.intake.blocker)}`,
    `resume_or_projects: ${untrusted(input.intake.resume_or_projects ?? "none")}`,
    `prior_recipe: ${untrusted(input.priorRecipe ?? "unknown")}`,
    `prior_diagnosis: ${untrusted(JSON.stringify(input.priorDiagnosis ?? {}))}`,
    `applications: ${untrusted(input.applicationSummary)}`,
    `projects: ${untrusted(input.projectsSummary)}`,
  ].join("\n");
}

async function loadIntakeContext(
  supabase: DbClient,
  userId: string,
): Promise<{
  intake: IntakeAnswers;
  sourceIntakeId: string | null;
  priorDiagnosis: unknown;
  priorRecipe: string | null;
  learnerVersion: number;
} | null> {
  const { data: intakeRow } = await supabase
    .from("intake_responses")
    .select("id, answers, version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let intake = intakeRow ? intakeFromAnswersJson(intakeRow.answers) : null;

  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("diagnosis, version, skill_track_id, skill_stage_id")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("path_plans")
    .select("ui, source_intake_id")
    .eq("user_id", userId)
    .maybeSingle();

  const priorRecipe =
    plan?.ui && typeof plan.ui === "object" && plan.ui !== null && "ui_recipe" in plan.ui
      ? String((plan.ui as { ui_recipe?: unknown }).ui_recipe ?? "") || null
      : null;

  if (!intake && learner?.diagnosis) {
    // Reconstruct a thin intake from diagnosis + plan when answers row is gone.
    const diag = learner.diagnosis as Record<string, unknown>;
    const blockers = stringList(diag.blockers, 4);
    const stage: PathStage =
      priorRecipe === "prep_room"
        ? "interviewing"
        : priorRecipe === "studio"
          ? "building"
          : "applying";
    const timeline: PathTimeline = "this_cycle";
    intake = {
      stage,
      timeline,
      constraints: stringList(diag.segment_tags, 16),
      target_roles: [],
      target_companies: [],
      blocker: blockers[0] ?? "Path needs a refresh",
    };
  }

  if (!intake) return null;

  return {
    intake,
    sourceIntakeId: intakeRow?.id ?? plan?.source_intake_id ?? null,
    priorDiagnosis: learner?.diagnosis ?? null,
    priorRecipe,
    learnerVersion: learner?.version ?? intakeRow?.version ?? 1,
  };
}

async function loadEventSummaries(
  supabase: DbClient,
  userId: string,
): Promise<{ applicationSummary: string; projectsSummary: string; statuses: string[] }> {
  const { data: apps } = await supabase
    .from("applications")
    .select("org, role, status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  const statuses = (apps ?? []).map((a) => a.status);
  const applicationSummary =
    (apps ?? [])
      .map((a) => `${a.status}: ${a.org} / ${a.role}`)
      .join("; ")
      .slice(0, 800) || "none";

  const { data: projects } = await supabase
    .from("user_projects")
    .select("project_slug, status")
    .eq("user_id", userId)
    .limit(12);

  const projectsSummary =
    (projects ?? [])
      .map((p) => `${p.status}:${p.project_slug}`)
      .join("; ")
      .slice(0, 400) || "none";

  return { applicationSummary, projectsSummary, statuses };
}

async function tryAiRediagnosis(
  supabase: DbClient,
  userId: string,
  intake: IntakeAnswers,
  pro: boolean,
  prompt: string,
  force: boolean,
): Promise<{ result: DiagnosisResult; mode: "ai" } | { overCap: true } | { heuristic: true }> {
  if (!aiEnabled()) return { heuristic: true };

  const { data: allowed } = await supabase.rpc("use_ai_quota", { p_kind: "rediagnosis" });
  if (allowed) {
    const raw = await generateText(REDIAGNOSIS_SYSTEM, prompt, {
      model: modelForTier(pro),
      maxTokens: 900,
      temperature: 0.3,
    });
    return { result: parseDiagnosisJson(raw, intake), mode: "ai" };
  }

  // Free rediagnosis cap is 0. Manual/force may burn intake_diagnosis instead.
  if (force) {
    const { data: intakeAllowed } = await supabase.rpc("use_ai_quota", {
      p_kind: "intake_diagnosis",
    });
    if (intakeAllowed) {
      const raw = await generateText(REDIAGNOSIS_SYSTEM, prompt, {
        model: modelForTier(pro),
        maxTokens: 900,
        temperature: 0.3,
      });
      return { result: parseDiagnosisJson(raw, intake), mode: "ai" };
    }
    if (!pro) return { overCap: true };
  }

  // Pro at ceiling, or auto path without quota: heuristic.
  return { heuristic: true };
}

async function persistDiagnosis(
  supabase: DbClient,
  userId: string,
  result: DiagnosisResult,
  sourceIntakeId: string | null,
  nextVersion: number,
): Promise<boolean> {
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
      user_id: userId,
      version: nextVersion,
      diagnosis: result.diagnosis as Json,
      skill_track_id: skillTrackId,
      skill_stage_id: result.skill_stage_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (learnerErr) return false;

  const { error: planErr } = await supabase.from("path_plans").upsert(
    {
      user_id: userId,
      ui: result.ui as unknown as Json,
      rationale: result.ui.why,
      source_intake_id: sourceIntakeId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (planErr) return false;

  // Preserve done/skipped history: skip open items, then append new todos.
  await supabase
    .from("path_tasks")
    .update({ status: "skipped", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("status", ["todo", "doing"]);

  if (result.tasks.length > 0) {
    const { data: maxRow } = await supabase
      .from("path_tasks")
      .select("sort_index")
      .eq("user_id", userId)
      .order("sort_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const base = (maxRow?.sort_index ?? -1) + 1;
    await supabase.from("path_tasks").insert(
      result.tasks.map((t, i) => ({
        user_id: userId,
        module_id: t.module_id,
        title: t.title,
        detail: t.detail ?? null,
        status: "todo",
        sort_index: base + i,
      })),
    );
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
        .eq("user_id", userId)
        .eq("project_slug", project.slug)
        .maybeSingle();
      if (!existing) {
        await supabase.from("user_projects").insert({
          user_id: userId,
          project_slug: project.slug,
          status: "assigned",
          checklist_state: {},
        });
      }
    }
  }

  return true;
}

/**
 * Re-run path diagnosis from latest intake (+ applications / projects).
 * Auto interview/oa flips use heuristic prep_room for free (no AI spend).
 * Pro uses REDIAGNOSIS_SYSTEM when rediagnosis quota allows.
 */
export async function rediagnoseUser(
  supabase: DbClient,
  userId: string,
  opts: RediagnoseOpts = { reason: "manual" },
): Promise<RediagnoseOutcome> {
  const force = Boolean(opts.force);
  const reason = opts.reason || "manual";

  const ctx = await loadIntakeContext(supabase, userId);
  if (!ctx) return { ok: false, reason: "no_context" };

  let intake = ctx.intake;
  if (opts.blockerNote?.trim()) {
    intake = {
      ...intake,
      blocker: opts.blockerNote.trim().slice(0, 400),
    };
  }

  const { applicationSummary, projectsSummary, statuses } = await loadEventSummaries(
    supabase,
    userId,
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, pro_until")
    .eq("id", userId)
    .maybeSingle();
  const pro = profile ? isPro(profile) : false;

  const interviewSignal =
    isInterviewFlipReason(reason) || applicationsNeedPrepRoom(statuses);

  // Free + auto interview/oa: heuristic prep_room only (rediagnosis free cap is 0).
  if (interviewSignal && !pro && !force) {
    const result = heuristicInterviewFlip(intake);
    const wrote = await persistDiagnosis(
      supabase,
      userId,
      result,
      ctx.sourceIntakeId,
      ctx.learnerVersion + 1,
    );
    if (!wrote) return { ok: false, reason: "write_failed" };
    return { ok: true, mode: "heuristic", recipe: result.ui.ui_recipe };
  }

  const prompt = rediagnosisUserPrompt({
    reason,
    intake: interviewSignal ? { ...intake, stage: "interviewing" } : intake,
    priorDiagnosis: ctx.priorDiagnosis,
    priorRecipe: ctx.priorRecipe,
    applicationSummary,
    projectsSummary,
  });

  const aiIntake = interviewSignal ? { ...intake, stage: "interviewing" as const } : intake;
  const aiAttempt = await tryAiRediagnosis(supabase, userId, aiIntake, pro, prompt, force);

  if ("overCap" in aiAttempt) return { ok: false, reason: "over_cap" };

  let result: DiagnosisResult;
  let mode: "ai" | "heuristic";
  if ("mode" in aiAttempt) {
    result = aiAttempt.result;
    mode = "ai";
  } else if (interviewSignal) {
    result = heuristicInterviewFlip(intake);
    mode = "heuristic";
  } else {
    result = heuristicDiagnosis(aiIntake);
    mode = "heuristic";
  }

  // If AI somehow left prep_room when interviews are live, keep prep_room fixture tone.
  if (interviewSignal && result.ui.ui_recipe !== "prep_room") {
    const flip = heuristicInterviewFlip(intake);
    result = {
      ...result,
      ui: {
        ...fixtureForRecipe("prep_room"),
        tone: flip.ui.tone,
        headline: result.ui.headline || flip.ui.headline,
        why: result.ui.why || flip.ui.why,
      },
      tasks: result.tasks.length ? result.tasks : flip.tasks,
    };
  }

  const wrote = await persistDiagnosis(
    supabase,
    userId,
    result,
    ctx.sourceIntakeId,
    ctx.learnerVersion + 1,
  );
  if (!wrote) return { ok: false, reason: "write_failed" };
  return { ok: true, mode, recipe: result.ui.ui_recipe };
}
