import { graphqlEndpoint, githubFetch, githubJson } from "./http";

export const CONTRIBUTION_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}`;

export type GithubContributionSample = {
  date: string;
  count: number;
  level: number;
};

const LEVELS: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export function contributionLevel(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= 4) return raw;
  if (typeof raw === "string" && raw in LEVELS) return LEVELS[raw];
  return null;
}

/** 365 UTC dates [today-364, today]. `to` is `now` (no future). `from` is start of that date. */
export function rollingYearWindow(now = new Date()): { from: string; to: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 364);
  return { from: from.toISOString(), to: now.toISOString() };
}

type GraphqlJson = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: Array<{
            contributionDays?: Array<{
              date?: string;
              contributionCount?: number;
              contributionLevel?: string;
            }>;
          }>;
        };
      };
    } | null;
  };
  errors?: Array<{ message?: string; type?: string }>;
};

export function parseContributionCalendar(json: GraphqlJson): GithubContributionSample[] {
  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  const days: GithubContributionSample[] = [];
  for (const week of weeks) {
    for (const day of week.contributionDays ?? []) {
      if (!day.date || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue;
      if (!Number.isInteger(day.contributionCount) || (day.contributionCount as number) < 0) continue;
      const level = contributionLevel(day.contributionLevel);
      if (level === null) continue;
      days.push({
        date: day.date,
        count: day.contributionCount as number,
        level,
      });
    }
  }
  return days;
}

export async function fetchContributionYear(input: {
  token: string;
  login: string;
  now?: Date;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<GithubContributionSample[]> {
  const window = rollingYearWindow(input.now);
  const { text } = await githubFetch(graphqlEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: CONTRIBUTION_QUERY,
      variables: { login: input.login, from: window.from, to: window.to },
    }),
    timeoutMs: 15_000,
    maxBytes: 256_000,
    token: input.token,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  const json = githubJson<GraphqlJson>(text);
  if (json.errors?.length) {
    const type = json.errors[0]?.type ?? "";
    if (type === "NOT_FOUND") throw new Error("GitHub user was not found.");
    throw new Error("GitHub contribution query failed.");
  }
  if (!json.data?.user) throw new Error("GitHub contribution query failed.");
  return parseContributionCalendar(json);
}

export type SyncCursor = {
  v: 1;
  from: string;
  to: string;
  offset: number;
  nextRetryAt: string | null;
  backoffSeconds: number;
};

export function parseSyncCursor(raw: string | null | undefined): SyncCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SyncCursor;
    if (parsed.v !== 1 || typeof parsed.offset !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function encodeSyncCursor(cursor: SyncCursor): string {
  return JSON.stringify(cursor);
}
