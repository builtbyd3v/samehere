import type { GithubConnectionPublic, GithubContributionDay } from "@/types/portfolio";

export type ActivityFilter = "all" | "github" | "samehere";

export type SamehereDay = {
  day: string;
  points: number;
  breakdown: Record<string, number>;
};

export const GITHUB_STALE_MS = 36 * 60 * 60 * 1000;

export type GithubActivityState =
  | { kind: "forthcoming" }
  | { kind: "pending" }
  | { kind: "unavailable"; status: "reauthorization_needed" | "disconnected" }
  | { kind: "empty"; lastSyncedAt: string | null }
  | {
      kind: "stale";
      lastSyncedAt: string;
      lastSyncError: string | null;
      days: GithubContributionDay[];
    }
  | {
      kind: "failed";
      lastSyncError: string;
      lastSyncedAt: string | null;
      days: GithubContributionDay[];
    }
  | { kind: "ready"; lastSyncedAt: string; days: GithubContributionDay[] };

export function githubSnapshotKnown(state: GithubActivityState): boolean {
  if (state.kind === "ready" || state.kind === "empty" || state.kind === "stale") return true;
  if (state.kind === "failed") return Boolean(state.lastSyncedAt) || state.days.length > 0;
  return false;
}

export function heatmapBreakdown(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
  }
  return out;
}

function latestFetchedAt(days: GithubContributionDay[]): string {
  return days.reduce((latest, day) => (day.fetched_at > latest ? day.fetched_at : latest), days[0].fetched_at);
}

export type ActivityCell = {
  date: string;
  sameherePoints: number;
  githubCount: number;
  samehereLevel: number;
  githubLevel: number;
  intensity: number;
  sources: Array<"samehere" | "github">;
};

export function samehereLevel(points: number): number {
  if (points <= 0) return 0;
  if (points <= 3) return 1;
  if (points <= 7) return 2;
  return 3;
}

export function githubVisualLevel(count: number, contributionLevel: number): number {
  if (count <= 0 && contributionLevel <= 0) return 0;
  return Math.min(3, Math.max(contributionLevel, count > 0 ? 1 : 0));
}

export function classifyGithubActivity(
  connection: Pick<
    GithubConnectionPublic,
    "status" | "last_synced_at" | "last_sync_error"
  > | null,
  days: GithubContributionDay[],
  now: Date = new Date()
): GithubActivityState {
  if (!connection) {
    if (days.length > 0) return snapshotFromPublicDays(days, now);
    return { kind: "forthcoming" };
  }
  if (connection.status === "disconnected") {
    return { kind: "unavailable", status: "disconnected" };
  }
  if (connection.status === "reauthorization_needed") {
    return { kind: "unavailable", status: "reauthorization_needed" };
  }
  if (connection.last_sync_error) {
    return {
      kind: "failed",
      lastSyncError: connection.last_sync_error,
      lastSyncedAt: connection.last_synced_at,
      days,
    };
  }
  if (!connection.last_synced_at) {
    return days.length === 0
      ? { kind: "pending" }
      : { kind: "stale", lastSyncedAt: days[0]?.fetched_at ?? now.toISOString(), lastSyncError: null, days };
  }
  const age = now.getTime() - new Date(connection.last_synced_at).getTime();
  if (Number.isFinite(age) && age > GITHUB_STALE_MS) {
    return {
      kind: "stale",
      lastSyncedAt: connection.last_synced_at,
      lastSyncError: connection.last_sync_error,
      days,
    };
  }
  if (days.length === 0) {
    return { kind: "empty", lastSyncedAt: connection.last_synced_at };
  }
  return { kind: "ready", lastSyncedAt: connection.last_synced_at, days };
}

export function mergeActivityDays(
  samehere: SamehereDay[],
  github: GithubContributionDay[],
  filter: ActivityFilter
): ActivityCell[] {
  const dates = new Set<string>();
  const sh = new Map<string, SamehereDay>();
  const gh = new Map<string, GithubContributionDay>();
  if (filter !== "github") {
    for (const day of samehere) {
      sh.set(day.day, day);
      dates.add(day.day);
    }
  }
  if (filter !== "samehere") {
    for (const day of github) {
      gh.set(day.contribution_date, day);
      dates.add(day.contribution_date);
    }
  }
  return [...dates]
    .sort()
    .map((date) => {
      const sameherePoints = filter === "github" ? 0 : (sh.get(date)?.points ?? 0);
      const githubRow = filter === "samehere" ? undefined : gh.get(date);
      const githubCount = githubRow?.contribution_count ?? 0;
      const shLevel = samehereLevel(sameherePoints);
      const ghLevel = githubVisualLevel(githubCount, githubRow?.contribution_level ?? 0);
      const sources: Array<"samehere" | "github"> = [];
      if (sameherePoints > 0) sources.push("samehere");
      if (githubCount > 0) sources.push("github");
      return {
        date,
        sameherePoints,
        githubCount,
        samehereLevel: shLevel,
        githubLevel: ghLevel,
        intensity: filter === "all" ? Math.max(shLevel, ghLevel) : filter === "github" ? ghLevel : shLevel,
        sources,
      };
    });
}

export function activityHeadline(
  filter: ActivityFilter,
  cells: ActivityCell[],
  githubState: GithubActivityState,
  samehereKnown = true
): { value: number | null; label: string } {
  if (filter === "github") {
    if (!githubSnapshotKnown(githubState)) {
      return { value: null, label: githubUnknownLabel(githubState) };
    }
    return {
      value: cells.reduce((sum, cell) => sum + cell.githubCount, 0),
      label: "GitHub contributions in the last year",
    };
  }
  if (filter === "samehere") {
    if (!samehereKnown) {
      return { value: null, label: "Samehere activity isn’t available right now" };
    }
    return {
      value: cells.reduce((sum, cell) => sum + cell.sameherePoints, 0),
      label: "Samehere points in the last year",
    };
  }
  if (!githubSnapshotKnown(githubState) && !samehereKnown) {
    return { value: null, label: "Activity isn’t available right now" };
  }
  if (!githubSnapshotKnown(githubState)) {
    return {
      value: cells.filter((cell) => cell.sameherePoints > 0).length,
      label: "Samehere active days — GitHub activity isn’t available yet",
    };
  }
  if (!samehereKnown) {
    return {
      value: cells.filter((cell) => cell.githubCount > 0).length,
      label: "GitHub active days — Samehere activity isn’t available right now",
    };
  }
  return {
    value: cells.filter((cell) => cell.sources.length > 0).length,
    label: "active days in the last year",
  };
}

function snapshotFromPublicDays(days: GithubContributionDay[], now: Date): GithubActivityState {
  const lastSyncedAt = latestFetchedAt(days);
  const age = now.getTime() - new Date(lastSyncedAt).getTime();
  if (Number.isFinite(age) && age > GITHUB_STALE_MS) {
    return { kind: "stale", lastSyncedAt, lastSyncError: null, days };
  }
  return { kind: "ready", lastSyncedAt, days };
}

function githubUnknownLabel(state: GithubActivityState): string {
  if (state.kind === "pending") return "GitHub is still syncing";
  if (state.kind === "failed") return "Couldn’t refresh GitHub activity";
  if (state.kind === "unavailable") {
    return state.status === "reauthorization_needed"
      ? "GitHub needs to be reconnected"
      : "GitHub is disconnected";
  }
  return "GitHub isn’t connected yet";
}
