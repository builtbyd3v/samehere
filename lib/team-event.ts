import type { TeamEventMode } from "@/types/portfolio";
import { parseContextLabel, type ContextLabel } from "@/lib/context-label";

export type { TeamEventMode };

export const TEAM_EVENT_NAME_MAX = 80;
export const LOOKING_FOR_TEAM: ContextLabel = "looking_for_team";

export type TeamEventFields = {
  team_event_name: string | null;
  team_event_date: string | null;
  team_event_mode: TeamEventMode | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function parseTeamEventMode(raw: unknown): TeamEventMode | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "") return null;
  if (s === "remote") return "remote";
  if (s === "in_person" || s === "inperson") return "in_person";
  return null;
}

export function parseTeamEventDate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2020 || year > 2100) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return null;
  }
  return s;
}

export function parseTeamEventName(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  return s;
}

export function teamEventError(input: {
  label: unknown;
  name: unknown;
  date: unknown;
  mode: unknown;
}): string | null {
  const label = parseContextLabel(input.label);
  const name = parseTeamEventName(input.name);
  const dateRaw = input.date == null || String(input.date).trim() === "" ? null : String(input.date).trim();
  const modeRaw = input.mode == null || String(input.mode).trim() === "" ? null : String(input.mode).trim();

  if (label !== LOOKING_FOR_TEAM) return null;
  if (name !== null && name.length > TEAM_EVENT_NAME_MAX) {
    return `Event name is capped at ${TEAM_EVENT_NAME_MAX} characters.`;
  }
  if (dateRaw !== null && parseTeamEventDate(dateRaw) === null) {
    return "Event date must be a real calendar day.";
  }
  if (modeRaw !== null && parseTeamEventMode(modeRaw) === null) {
    return "Pick Remote, In person, or none.";
  }
  return null;
}

export function parseTeamEventFields(input: {
  label: unknown;
  name: unknown;
  date: unknown;
  mode: unknown;
}): TeamEventFields {
  if (parseContextLabel(input.label) !== LOOKING_FOR_TEAM) {
    return { team_event_name: null, team_event_date: null, team_event_mode: null };
  }
  return {
    team_event_name: parseTeamEventName(input.name),
    team_event_date: parseTeamEventDate(input.date),
    team_event_mode: parseTeamEventMode(input.mode),
  };
}

export function formatTeamEventDate(isoDate: string | null | undefined): string | null {
  const parsed = parseTeamEventDate(isoDate);
  if (!parsed) return null;
  const month = Number(parsed.slice(5, 7));
  const day = Number(parsed.slice(8, 10));
  const monthName = MONTHS[month - 1];
  if (!monthName) return null;
  return `${monthName} ${day}`;
}

export function formatTeamEventMode(mode: TeamEventMode | null | undefined): string | null {
  if (mode === "remote") return "Remote";
  if (mode === "in_person") return "In person";
  return null;
}

export function formatTeamEventLine(fields: {
  team_event_name?: string | null;
  team_event_date?: string | null;
  team_event_mode?: TeamEventMode | string | null;
}): string | null {
  const parts = [
    parseTeamEventName(fields.team_event_name),
    formatTeamEventDate(fields.team_event_date),
    formatTeamEventMode(parseTeamEventMode(fields.team_event_mode)),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function lookingForTeamFeedPath(): string {
  return "/feed?label=looking_for_team";
}

export function isLookingForTeamFeed(params: { tab?: string; label?: string }): boolean {
  return parseContextLabel(params.label) === LOOKING_FOR_TEAM;
}
