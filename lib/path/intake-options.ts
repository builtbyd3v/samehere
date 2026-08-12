import type { PathStage } from "./types";
import type { PathTimeline } from "./diagnose";

export const STAGE_OPTIONS = [
  { value: "no_experience", label: "No experience yet" },
  { value: "building", label: "Building projects / skills" },
  { value: "applying", label: "Actively applying" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offers", label: "Have offers / deciding" },
] as const satisfies ReadonlyArray<{ value: PathStage; label: string }>;

export const TIMELINE_OPTIONS = [
  { value: "this_cycle", label: "This recruiting cycle" },
  { value: "next_cycle", label: "Next cycle" },
  { value: "exploring", label: "Still exploring" },
] as const satisfies ReadonlyArray<{ value: PathTimeline; label: string }>;

export const CONSTRAINT_OPTIONS = [
  { value: "first_gen", label: "First-gen" },
  { value: "transfer", label: "Transfer" },
  { value: "commuter", label: "Commuter" },
  { value: "international", label: "International" },
  { value: "limited_network", label: "Limited network" },
  { value: "working_job", label: "Working a job" },
  { value: "career_switch", label: "Career switch" },
  { value: "overwhelmed", label: "Feeling overwhelmed" },
] as const;

export const CONSTRAINT_VALUES = new Set<string>(
  CONSTRAINT_OPTIONS.map((opt) => opt.value),
);
