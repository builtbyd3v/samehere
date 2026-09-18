import { apiEndpoint, githubFetch, githubJson } from "./http";

export const REPOS_PER_PAGE = 30;

export type PublicGithubRepo = {
  id: number;
  name: string;
  fullName: string;
  fork: boolean;
  defaultBranch: string;
};

type RepoJson = {
  id?: number;
  name?: string;
  full_name?: string;
  private?: boolean;
  fork?: boolean;
  default_branch?: string;
  owner?: { login?: string; id?: number };
};

export function isGithubLogin(value: string): boolean {
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value);
}

export function isGithubRepoName(value: string): boolean {
  return /^[A-Za-z0-9_.-]{1,100}$/.test(value) && value !== "." && value !== "..";
}

export function canonicalFullName(fullName: string): { owner: string; name: string } | null {
  const parts = fullName.split("/");
  if (parts.length !== 2) return null;
  const [owner, name] = parts;
  if (!owner || !name || !isGithubLogin(owner) || !isGithubRepoName(name)) return null;
  return { owner, name };
}

function mapPublicRepo(row: RepoJson): PublicGithubRepo | null {
  if (!Number.isInteger(row.id) || row.private !== false) return null;
  if (!row.name || !row.full_name || !isGithubRepoName(row.name)) return null;
  const parsed = canonicalFullName(row.full_name);
  if (!parsed) return null;
  return {
    id: row.id as number,
    name: parsed.name,
    fullName: `${parsed.owner}/${parsed.name}`,
    fork: row.fork === true,
    defaultBranch: row.default_branch?.trim() || "main",
  };
}

export async function listPublicReposForIdentity(input: {
  token: string;
  page: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<{ page: number; perPage: number; hasMore: boolean; repositories: PublicGithubRepo[] }> {
  const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1;
  const params = new URLSearchParams({
    visibility: "public",
    affiliation: "owner,collaborator,organization_member",
    sort: "updated",
    per_page: String(REPOS_PER_PAGE),
    page: String(page),
  });
  const { text } = await githubFetch(apiEndpoint(`/user/repos?${params.toString()}`), {
    timeoutMs: 12_000,
    maxBytes: 512_000,
    token: input.token,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  const rows = githubJson<RepoJson[]>(text);
  if (!Array.isArray(rows)) throw new Error("GitHub repository list was invalid.");
  const repositories = rows.map(mapPublicRepo).filter((row): row is PublicGithubRepo => row !== null);
  return {
    page,
    perPage: REPOS_PER_PAGE,
    hasMore: rows.length >= REPOS_PER_PAGE,
    repositories,
  };
}

export type ResolvedPublicRepo = PublicGithubRepo & {
  commitSha: string;
};

export async function resolvePublicRepoById(input: {
  token: string;
  repositoryId: number;
  commitSha?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<ResolvedPublicRepo> {
  if (!Number.isInteger(input.repositoryId) || input.repositoryId <= 0) {
    throw new Error("invalid repository id");
  }
  const { text } = await githubFetch(apiEndpoint(`/repositories/${input.repositoryId}`), {
    timeoutMs: 10_000,
    maxBytes: 64_000,
    token: input.token,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  const mapped = mapPublicRepo(githubJson<RepoJson>(text));
  if (!mapped) throw new Error("Repository is not public or is not available to this account.");
  if (input.commitSha) {
    if (!/^[0-9a-f]{40}$/i.test(input.commitSha)) throw new Error("invalid commit sha");
    const sha = input.commitSha.toLowerCase();
    await verifyCommitExists({
      token: input.token,
      fullName: mapped.fullName,
      commitSha: sha,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    });
    return { ...mapped, commitSha: sha };
  }
  const sha = await resolveDefaultCommit({
    token: input.token,
    fullName: mapped.fullName,
    defaultBranch: mapped.defaultBranch,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  return { ...mapped, commitSha: sha };
}

export async function verifyCommitExists(input: {
  token: string;
  fullName: string;
  commitSha: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const parsed = canonicalFullName(input.fullName);
  if (!parsed) throw new Error("invalid repository name");
  const { text } = await githubFetch(
    apiEndpoint(`/repos/${parsed.owner}/${parsed.name}/commits/${input.commitSha}`),
    {
      timeoutMs: 10_000,
      maxBytes: 64_000,
      token: input.token,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    }
  );
  const json = githubJson<{ sha?: string }>(text);
  if (!json.sha || json.sha.toLowerCase() !== input.commitSha) {
    throw new Error("Reserved commit is not available.");
  }
}

export async function resolveDefaultCommit(input: {
  token: string;
  fullName: string;
  defaultBranch: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const parsed = canonicalFullName(input.fullName);
  if (!parsed) throw new Error("invalid repository name");
  const branch = encodeURIComponent(input.defaultBranch);
  const { text } = await githubFetch(
    apiEndpoint(`/repos/${parsed.owner}/${parsed.name}/commits/${branch}`),
    {
      timeoutMs: 10_000,
      maxBytes: 64_000,
      token: input.token,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    }
  );
  const json = githubJson<{ sha?: string }>(text);
  if (!json.sha || !/^[0-9a-f]{40}$/i.test(json.sha)) {
    throw new Error("Could not resolve a commit SHA.");
  }
  return json.sha.toLowerCase();
}
