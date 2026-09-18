import { ANALYSES_PATH, analysisPath } from "@/lib/repository-analysis/seams";
import type { AnalysisPresentation } from "@/lib/repository-analysis/status";
import type { GithubOwnerSeam } from "@/lib/github/seams";

export const ANALYSIS_QUERY = "analysis";
export const ANALYSES_LATEST_PATH = `${ANALYSES_PATH}?latest=1`;
export const GITHUB_STATUS_PATH = "/api/integrations/github/status";
export const GITHUB_REPOS_PATH = "/api/integrations/github/repos";
export const GITHUB_CONNECT_PATH = "/api/integrations/github";
export const GITHUB_REFRESH_PATH = "/api/integrations/github/refresh";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ANALYSIS_STAGES = [
  { key: "queued", label: "Queued" },
  { key: "reading_repository", label: "Reading repository" },
  { key: "analyzing", label: "Analyzing" },
  { key: "saving_draft", label: "Saving draft" },
] as const;

export type AnalysisStageKey = (typeof ANALYSIS_STAGES)[number]["key"];
export type StageRowState = "pending" | "active" | "done" | "stopped";
export type StageRow = { key: AnalysisStageKey; label: string; state: StageRowState };

export type PickerRepo = {
  id: number;
  name: string;
  fullName: string;
  fork: boolean;
};

export type AnalysisEvidenceView = {
  analysisId: string;
  repositoryFullName: string | null;
  commitSha: string | null;
  coverageFacts: string[];
  evidence: Array<{ path: string; excerpt?: string }>;
  uncertaintyNotes: string[];
};

const LIVE_KINDS = new Set<AnalysisPresentation["kind"]>([
  "queued",
  "reading_repository",
  "analyzing",
  "saving_draft",
]);

export function isLiveAnalysisKind(kind: AnalysisPresentation["kind"] | null | undefined): boolean {
  return kind != null && LIVE_KINDS.has(kind);
}

export function parseAnalysisQuery(value: string | string[] | undefined | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw.toLowerCase();
}

export function analysisPageHref(pathname: string, analysisId: string | null): string {
  const url = new URL(pathname, "http://samehere.local");
  if (analysisId) url.searchParams.set(ANALYSIS_QUERY, analysisId);
  else url.searchParams.delete(ANALYSIS_QUERY);
  url.searchParams.delete("github_error");
  return `${url.pathname}${url.search}`;
}

export function replaceAnalysisQuery(analysisId: string | null): void {
  const next = analysisPageHref(window.location.pathname, analysisId);
  const current = `${window.location.pathname}${window.location.search}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}

export function filterPublicRepos<T extends Pick<PickerRepo, "name" | "fullName">>(repos: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return repos;
  return repos.filter(
    (repo) => repo.fullName.toLowerCase().includes(needle) || repo.name.toLowerCase().includes(needle)
  );
}

export function stageRowStates(presented: { kind: AnalysisPresentation["kind"]; status?: string }): StageRow[] {
  const cursor =
    presented.kind === "succeeded"
      ? ANALYSIS_STAGES.length
      : ANALYSIS_STAGES.findIndex((row) => row.key === (presented.kind === "interrupted" ? presented.status : presented.kind));
  const stopped = presented.kind === "failed" || presented.kind === "cancelled" || presented.kind === "interrupted";
  return ANALYSIS_STAGES.map((row, index) => {
    if (presented.kind === "succeeded" || cursor > index) return { ...row, state: "done" };
    if (cursor === index) return { ...row, state: stopped ? "stopped" : "active" };
    return { ...row, state: "pending" };
  });
}

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function coverageFacts(coverage: Record<string, unknown> | null | undefined): string[] {
  if (!coverage) return [];
  const facts: string[] = [];
  if (typeof coverage.fullName === "string" && coverage.fullName.trim()) facts.push(coverage.fullName.trim());
  const filesRead = asInt(coverage.filesRead);
  const fileLimit = asInt(coverage.fileLimit);
  if (filesRead != null && fileLimit != null) facts.push(`Sampled ${filesRead} files (limit ${fileLimit})`);
  else if (filesRead != null) facts.push(`Sampled ${filesRead} files`);
  const bytesRead = asInt(coverage.bytesRead);
  const byteLimit = asInt(coverage.byteLimit);
  if (bytesRead != null && byteLimit != null) facts.push(`${bytesRead} bytes sampled (limit ${byteLimit})`);
  else if (bytesRead != null) facts.push(`${bytesRead} bytes sampled`);
  if (typeof coverage.commitSha === "string" && /^[0-9a-f]{7,40}$/i.test(coverage.commitSha)) {
    facts.push(`Commit ${coverage.commitSha.slice(0, 7)}`);
  }
  if (coverage.fork === true) facts.push("Fork — describe your role before publishing");
  if (coverage.partial === true) facts.push("Partial coverage");
  if (Array.isArray(coverage.partialReasons)) {
    for (const reason of coverage.partialReasons) {
      if (typeof reason === "string" && reason.trim()) facts.push(reason.trim());
    }
  }
  return facts;
}

export function evidenceViewFromAnalysis(input: {
  id: string;
  repository_full_name?: string | null;
  commit_sha?: string | null;
  coverage?: Record<string, unknown> | null;
  evidence?: Array<{ path: string; excerpt?: string }> | null;
  draft?: { uncertaintyNotes?: string[]; evidence?: Array<{ path: string; excerpt?: string }> } | null;
}): AnalysisEvidenceView {
  const evidence = (input.evidence ?? input.draft?.evidence ?? []).filter(
    (item): item is { path: string; excerpt?: string } => Boolean(item && typeof item.path === "string")
  );
  return {
    analysisId: input.id,
    repositoryFullName: input.repository_full_name ?? null,
    commitSha: input.commit_sha ?? null,
    coverageFacts: coverageFacts(input.coverage ?? null),
    evidence,
    uncertaintyNotes: (input.draft?.uncertaintyNotes ?? []).filter((note) => typeof note === "string" && note.trim()),
  };
}

export async function readResponseJson(
  res: Response
): Promise<{ status: number; body: unknown; parseError: boolean }> {
  const text = await res.text();
  if (!text) return { status: res.status, body: null, parseError: false };
  try {
    return { status: res.status, body: JSON.parse(text) as unknown, parseError: false };
  } catch {
    return { status: res.status, body: null, parseError: true };
  }
}

export function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export async function ownerRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: unknown; error: string | null }> {
  try {
    const res = await fetch(input, { cache: "no-store", ...init });
    const parsed = await readResponseJson(res);
    if (parsed.parseError) {
      return { ok: false, status: parsed.status, body: null, error: "Could not read the response." };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: parsed.status,
        body: parsed.body,
        error: messageFromBody(parsed.body, "Request failed."),
      };
    }
    return { ok: true, status: parsed.status, body: parsed.body, error: null };
  } catch {
    return { ok: false, status: 0, body: null, error: "Network error. Try again." };
  }
}

export function githubErrorCopy(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === "denied") return "GitHub access was denied.";
  if (code === "state") return "GitHub connection could not be verified. Try again.";
  if (code === "session") return "GitHub connection did not match this account.";
  if (code === "identity") return "GitHub identity could not be verified.";
  if (code === "unavailable") return "GitHub connection is unavailable. You can still add a project manually.";
  return "GitHub connection failed. You can still add a project manually.";
}

export type GithubStatusPayload = {
  oauthAvailable: boolean;
  analysisAvailable: boolean;
  connection: {
    id: string;
    github_login: string;
    status: "connected" | "reauthorization_needed";
    last_synced_at: string | null;
    last_sync_error: string | null;
  } | null;
  manualProjectPath: string;
  seam: GithubOwnerSeam;
  error?: string;
};

export type AnalysisReadPayload = {
  analysis: {
    id: string;
    project_id: string | null;
    repository_full_name: string | null;
    commit_sha: string;
    coverage: Record<string, unknown> | null;
    evidence: Array<{ path: string; excerpt?: string }> | null;
    draft: { uncertaintyNotes?: string[]; evidence?: Array<{ path: string; excerpt?: string }> } | null;
  } | null;
  presentation: AnalysisPresentation | null;
  seam: { editorHref: string | null } | null;
  manualProjectPath?: string;
  error?: string;
};

export type WorkbenchSnapshot = {
  status: GithubStatusPayload | null;
  statusError: string | null;
  repos: PickerRepo[];
  hasMore: boolean;
  reposError: string | null;
  analysisId: string | null;
  presentation: AnalysisPresentation | null;
  analysis: AnalysisReadPayload["analysis"];
  editorHref: string | null;
  analysisError: string | null;
};

function asPickerRepos(body: unknown): { repositories: PickerRepo[]; hasMore: boolean } {
  if (!body || typeof body !== "object") return { repositories: [], hasMore: false };
  const raw = body as { repositories?: unknown; hasMore?: unknown };
  const repositories = Array.isArray(raw.repositories)
    ? raw.repositories.filter((row): row is PickerRepo => {
        if (!row || typeof row !== "object") return false;
        const repo = row as PickerRepo;
        return Number.isInteger(repo.id) && typeof repo.name === "string" && typeof repo.fullName === "string";
      })
    : [];
  return { repositories, hasMore: raw.hasMore === true };
}

export function analysisReadFromBody(body: unknown): {
  analysisId: string | null;
  presentation: AnalysisPresentation | null;
  analysis: AnalysisReadPayload["analysis"];
  editorHref: string | null;
} {
  if (!body || typeof body !== "object") {
    return { analysisId: null, presentation: null, analysis: null, editorHref: null };
  }
  const raw = body as AnalysisReadPayload;
  return {
    analysisId: raw.analysis?.id ?? null,
    presentation: raw.presentation ?? null,
    analysis: raw.analysis ?? null,
    editorHref: raw.seam?.editorHref ?? null,
  };
}

export async function loadWorkbenchSnapshot(urlAnalysisId: string | null): Promise<WorkbenchSnapshot> {
  const statusRes = await ownerRequest(GITHUB_STATUS_PATH);
  const status =
    statusRes.ok && statusRes.body && typeof statusRes.body === "object"
      ? (statusRes.body as GithubStatusPayload)
      : null;
  const statusError = statusRes.ok ? (status?.error ?? null) : statusRes.error;

  let repos: PickerRepo[] = [];
  let hasMore = false;
  let reposError: string | null = null;
  if (status?.connection?.status === "connected") {
    const listed = await ownerRequest(`${GITHUB_REPOS_PATH}?page=1`);
    if (!listed.ok) {
      reposError = listed.error;
    } else {
      const parsed = asPickerRepos(listed.body);
      repos = parsed.repositories;
      hasMore = parsed.hasMore;
    }
  }

  const analysisRes = await ownerRequest(urlAnalysisId ? analysisPath(urlAnalysisId) : ANALYSES_LATEST_PATH);
  let analysisId: string | null = null;
  let presentation: AnalysisPresentation | null = null;
  let analysis: AnalysisReadPayload["analysis"] = null;
  let editorHref: string | null = null;
  let analysisError: string | null = null;
  if (!analysisRes.ok) {
    analysisError = analysisRes.error;
  } else {
    const read = analysisReadFromBody(analysisRes.body);
    analysisId = read.analysisId;
    presentation = read.presentation;
    analysis = read.analysis;
    editorHref = read.editorHref;
  }

  return {
    status,
    statusError,
    repos,
    hasMore,
    reposError,
    analysisId,
    presentation,
    analysis,
    editorHref,
    analysisError,
  };
}

export { asPickerRepos };
