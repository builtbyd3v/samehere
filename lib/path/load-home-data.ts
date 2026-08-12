import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiagnosisBlob } from "./diagnose";
import { getInterviewBank, getProjectBySlug, getSkillTrack } from "./seeds";
import type { ModuleId } from "./types";

export type PathTaskSummary = {
  id: string;
  moduleId: ModuleId;
  title: string;
  detail: string | null;
  status: "todo" | "doing";
};

export type AssignedProjectSummary = {
  slug: string;
  title: string;
  status: string;
  checked: number;
  total: number;
};

export type InterviewContext = {
  org: string;
  role: string;
  status: "oa" | "interview";
  bankSlug: string | null;
  question: string | null;
};

export type SkillStageSummary = {
  track: string;
  stage: string;
  description: string;
  nextSkill: string | null;
};

export type HomePathContext = {
  tasks: PathTaskSummary[];
  project: AssignedProjectSummary | null;
  interview: InterviewContext | null;
  diagnosis: Pick<DiagnosisBlob, "strengths" | "gaps" | "blockers"> | null;
  skillStage: SkillStageSummary | null;
};

const MODULE_IDS = new Set<ModuleId>([
  "dossier",
  "opportunities",
  "applications",
  "pitch",
  "project_plan",
  "interview_prep",
  "helpers",
  "skill_stages",
]);

function isModuleId(value: string): value is ModuleId {
  return MODULE_IDS.has(value as ModuleId);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 8);
}

function parseDiagnosis(value: unknown): HomePathContext["diagnosis"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const diagnosis = {
    strengths: stringArray(row.strengths),
    gaps: stringArray(row.gaps),
    blockers: stringArray(row.blockers),
  };
  if (!diagnosis.strengths.length && !diagnosis.gaps.length && !diagnosis.blockers.length) {
    return null;
  }
  return diagnosis;
}

function checkedCount(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value as Record<string, unknown>).filter((item) => item === true).length;
}

async function loadTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<PathTaskSummary[]> {
  const { data, error } = await supabase
    .from("path_tasks")
    .select("id, module_id, title, detail, status")
    .eq("user_id", userId)
    .in("status", ["todo", "doing"])
    .order("sort_index", { ascending: true })
    .limit(8);

  if (error) return [];
  return (data ?? []).flatMap((task) => {
    if (!isModuleId(task.module_id)) return [];
    if (task.status !== "todo" && task.status !== "doing") return [];
    return [{
      id: task.id,
      moduleId: task.module_id,
      title: task.title,
      detail: task.detail,
      status: task.status,
    }];
  });
}

async function loadProject(
  supabase: SupabaseClient,
  userId: string,
): Promise<AssignedProjectSummary | null> {
  const { data, error } = await supabase
    .from("user_projects")
    .select("project_slug, status, checklist_state")
    .eq("user_id", userId)
    .in("status", ["assigned", "doing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const project = getProjectBySlug(data.project_slug);
  if (!project) return null;
  const required = project.build_checklist.filter((item) => !item.optional);
  return {
    slug: project.slug,
    title: project.title,
    status: data.status,
    checked: Math.min(checkedCount(data.checklist_state), required.length),
    total: required.length,
  };
}

async function loadLearner(
  supabase: SupabaseClient,
  userId: string,
): Promise<Pick<HomePathContext, "diagnosis" | "skillStage">> {
  const { data, error } = await supabase
    .from("learner_profiles")
    .select("diagnosis, skill_track_id, skill_stage_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { diagnosis: null, skillStage: null };
  const track = data.skill_track_id ? getSkillTrack(data.skill_track_id) : undefined;
  const stage = track?.stages.find((item) => item.id === data.skill_stage_id);
  return {
    diagnosis: parseDiagnosis(data.diagnosis),
    skillStage: track && stage
      ? {
          track: track.title,
          stage: stage.title,
          description: stage.description,
          nextSkill: stage.skills[0]?.name ?? null,
        }
      : null,
  };
}

async function loadInterview(
  supabase: SupabaseClient,
  userId: string,
): Promise<InterviewContext | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("org, role, status")
    .eq("user_id", userId)
    .in("status", ["oa", "interview"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || (data.status !== "oa" && data.status !== "interview")) return null;
  const bank = getInterviewBank(data.org);
  return {
    org: data.org,
    role: data.role,
    status: data.status,
    bankSlug: bank?.company_slug ?? null,
    question: bank?.questions[0]?.prompt ?? null,
  };
}

export async function loadHomePathContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<HomePathContext> {
  const [tasks, project, learner, interview] = await Promise.all([
    loadTasks(supabase, userId),
    loadProject(supabase, userId),
    loadLearner(supabase, userId),
    loadInterview(supabase, userId),
  ]);

  return {
    tasks,
    project,
    interview,
    diagnosis: learner.diagnosis,
    skillStage: learner.skillStage,
  };
}
