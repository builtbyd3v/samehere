/**
 * Shared portfolio / GitHub-analysis contracts.
 *
 * SQL: supabase/migrations/20260910100000_portfolio_data_contracts.sql
 * Applied: no. Prepared locally only. Live `.env.local` is not a verified
 * disposable database; do not apply this migration to it.
 *
 * Dependent workers must import these DTOs and call the named RPCs. Do not
 * read `private.github_credentials` or invent service-role table scans for
 * anonymous/public portfolio reads.
 */

export const PORTFOLIO_MIGRATION = "20260910100000_portfolio_data_contracts.sql" as const;
export const PORTFOLIO_FINALIZE_MIGRATION =
  "20260910130000_repository_analysis_finalize.sql" as const;

export type ContextLabel = "building" | "learning" | "stuck";
export type OpenToTag = "collaborate" | "study" | "feedback";
export type PortfolioSection =
  | "intro"
  | "projects"
  | "activity"
  | "experience"
  | "education"
  | "posts";
export type ProjectStatus = "draft" | "published";
export type GithubConnectionStatus =
  | "connected"
  | "reauthorization_needed"
  | "disconnected";
export type AnalysisStatus =
  | "queued"
  | "reading_repository"
  | "analyzing"
  | "saving_draft"
  | "succeeded"
  | "failed"
  | "cancelled";
export type AnalysisUsageSettlement = "pending" | "success" | "released" | "abuse";
export type PortfolioMetricKind = "view" | "click";

/** Exact exception messages raised by portfolio RPCs. Pin tests to these. */
export const PORTFOLIO_RPC_ERRORS = {
  notAuthenticated: "not authenticated",
  accountSuspended: "account suspended",
  notOwner: "not owner",
  notFound: "not found",
  invalidInput: "invalid input",
  quotaExceeded: "analysis quota exceeded",
  dailyAttemptCap: "daily analysis attempt cap exceeded",
  analysisInProgress: "analysis already in progress",
  staleAttempt: "stale analysis attempt",
  staleEpoch: "stale connection epoch",
  connectionInactive: "github connection inactive",
  leaseHeld: "analysis lease held",
  leaseExpired: "analysis lease expired",
  publishRequiresRole: "published project requires personal role",
} as const;

/**
 * Pilot caps. Server source of truth is public.portfolio_analysis_caps().
 * This object must stay byte-identical to that SQL function. Not launch economics.
 */
export const ANALYSIS_QUOTA = {
  monthTimezone: "UTC",
  freeSuccessPerMonth: 1,
  proSuccessPerMonth: 10,
  freeAttemptsPerDay: 8,
  proAttemptsPerDay: 24,
  leaseSeconds: 90,
  queuedSeconds: 120,
} as const;

export type PortfolioPublishFlags = {
  publish_intro: boolean;
  publish_projects: boolean;
  publish_activity: boolean;
  publish_experience: boolean;
  publish_education: boolean;
  publish_posts: boolean;
  allow_indexing: boolean;
};

export type PortfolioSettings = PortfolioPublishFlags & {
  owner_id: string;
  section_order: PortfolioSection[];
  updated_at: string;
  version: number;
};

export type ProjectWriteInput = {
  title: string;
  summary: string | null;
  description: string | null;
  personalRole: string | null;
  technologies: string[];
  keyFeatures: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  status: ProjectStatus;
};

export type PortfolioProject = ProjectWriteInput & {
  id: string;
  owner_id: string;
  sort_order: number;
  published_at: string | null;
  /** Service/definer only. Clients cannot INSERT/UPDATE these three. */
  source_repository_id: number | null;
  source_commit_sha: string | null;
  source_analysis_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Public projection. No draft/analysis internals. */
export type PublicPortfolioProject = {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  description: string | null;
  personal_role: string | null;
  technologies: string[];
  key_features: string[];
  repo_url: string | null;
  demo_url: string | null;
  published_at: string;
  sort_order: number;
};

export type PublicPortfolioProjection = {
  owner_id: string;
  username: string;
  is_private: boolean;
  allow_indexing: boolean;
  publish_intro: boolean;
  publish_projects: boolean;
  publish_activity: boolean;
  publish_experience: boolean;
  publish_education: boolean;
  publish_posts: boolean;
  /**
   * Overall activity section, not GitHub. True when
   * `portfolio_activity_readable` passes (publish_activity, public account,
   * not blocked, heatmap public or accepted follower). GitHub days are
   * `get_public_github_contributions` and may be empty when this is true.
   */
  activity_visible: boolean;
  section_order: PortfolioSection[];
};

export type PublicPortfolioExperience = {
  id: string;
  kind: string;
  org: string;
  role: string;
  term: string | null;
  note: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

export type PublicPortfolioEducation = {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  class_year: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

export type GithubConnectionPublic = {
  id: string;
  owner_id: string;
  github_user_id: number;
  github_login: string;
  epoch: number;
  status: GithubConnectionStatus;
  connected_at: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  last_error_at: string | null;
};

export type GithubContributionDay = {
  connection_id: string;
  owner_id: string;
  contribution_date: string;
  contribution_count: number;
  contribution_level: number;
  fetched_at: string;
};

/**
 * Server-only encrypted tokens. Never select this from a browser client.
 * Table: private.github_credentials (no PostgREST). Reach only through
 * public upsert/get/delete_github_credentials granted to service_role.
 */
export type GithubCredentialsRecord = {
  connection_id: string;
  owner_id: string;
  connection_epoch: number;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  key_version: number;
};

export type AnalysisDraft = {
  title: string;
  summary: string;
  description: string;
  technologies: string[];
  keyFeatures: string[];
  uncertaintyNotes: string[];
  evidence: Array<{ path: string; excerpt?: string }>;
};

export type RepositoryAnalysis = {
  id: string;
  owner_id: string;
  project_id: string | null;
  connection_id: string;
  connection_epoch: number;
  repository_id: number;
  repository_full_name: string | null;
  commit_sha: string;
  request_key: string;
  prompt_version: string;
  status: AnalysisStatus;
  attempt_id: string;
  parent_analysis_id: string | null;
  parent_attempt_id: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  draft: AnalysisDraft | null;
  evidence: AnalysisDraft["evidence"] | null;
  coverage: Record<string, unknown> | null;
  model: string | null;
  token_input: number | null;
  token_output: number | null;
  estimated_cost_usd: number | null;
  safe_error: string | null;
  created_at: string;
  started_at: string | null;
  updated_at: string;
  completed_at: string | null;
};

export type RepositoryAnalysisUsage = {
  id: string;
  owner_id: string;
  month: string;
  analysis_id: string;
  reserved_at: string;
  settled_at: string | null;
  settlement: AnalysisUsageSettlement;
  counts_toward_success: boolean;
  token_input: number | null;
  token_output: number | null;
  estimated_cost_usd: number | null;
  model: string | null;
  prompt_version: string | null;
};

export type PortfolioDailyMetric = {
  owner_id: string;
  project_id: string | null;
  metric_date: string;
  view_count: number;
  click_count: number;
};

export type ReserveRepositoryAnalysisArgs = {
  p_project_id: string | null;
  p_repository_id: number;
  p_repository_full_name: string | null;
  p_commit_sha: string;
  p_request_key: string;
  p_prompt_version: string;
};

export type ReserveRepositoryAnalysisResult = {
  analysis_id: string;
  reused: boolean;
  status: AnalysisStatus;
  request_key: string;
  attempt_id: string;
};

export type AcquireAnalysisLeaseArgs = {
  p_analysis_id: string;
  p_worker_id: string;
  p_ttl_seconds?: number;
};

export type UpsertGithubContributionDayArgs = {
  p_connection_id: string;
  p_expected_epoch: number;
  p_date: string;
  p_count: number;
  p_level: number;
};

export type MarkGithubConnectionStatusArgs = {
  p_connection_id: string;
  p_expected_epoch: number;
  p_status: Exclude<GithubConnectionStatus, "disconnected">;
  p_safe_error: string | null;
};

export type IncrementPortfolioDailyMetricArgs = {
  p_owner_id: string;
  p_project_id: string | null;
  p_kind: PortfolioMetricKind;
  /** Authenticated viewer the metrics API resolved. Null = anonymous. */
  p_viewer_id: string | null;
};

export type AcquireAnalysisLeaseResult = {
  analysis_id: string;
  attempt_id: string;
  lease_expires_at: string;
};

export type CommitRepositoryAnalysisArgs = {
  p_analysis_id: string;
  p_attempt_id: string;
  p_worker_id: string;
  p_connection_epoch: number;
  p_status: Extract<AnalysisStatus, "succeeded" | "failed" | "cancelled">;
  p_draft?: AnalysisDraft | null;
  p_evidence?: AnalysisDraft["evidence"] | null;
  p_coverage?: Record<string, unknown> | null;
  p_safe_error?: string | null;
  p_model?: string | null;
  p_prompt_version?: string | null;
  p_token_input?: number | null;
  p_token_output?: number | null;
  p_estimated_cost_usd?: number | null;
};

export type FinalizeRepositoryAnalysisArgs = CommitRepositoryAnalysisArgs;

export type ReplaceGithubContributionSnapshotArgs = {
  p_connection_id: string;
  p_expected_epoch: number;
  /** `{date:'YYYY-MM-DD', count:number, level:0|1|2|3|4}` — complete official window. */
  p_days: Array<{ date: string; count: number; level: number }>;
  p_from: string;
  p_to: string;
};

export type AdvanceAnalysisStageArgs = {
  p_analysis_id: string;
  p_attempt_id: string;
  p_worker_id: string;
  p_connection_epoch: number;
  p_status: Extract<
    AnalysisStatus,
    "queued" | "reading_repository" | "analyzing" | "saving_draft"
  >;
};

export type AnalysisUsageMonth = {
  month: string;
  success_count: number;
  attempt_count: number;
  success_cap: number;
  daily_attempt_count: number;
  daily_attempt_cap: number;
};

/**
 * RPC signatures (PostgREST / supabase.rpc names).
 *
 * Caps: public.portfolio_analysis_caps() = ANALYSIS_QUOTA. Clients cannot
 * pass tier/cap/owner/charge.
 *
 * public, granted to authenticated unless noted:
 *   portfolio_analysis_caps() → ANALYSIS_QUOTA row
 *   reserve_repository_analysis(...) → ReserveRepositoryAnalysisResult
 *     Duplicate (owner, request_key) returns the existing row. Same
 *     owner+repo+sha+prompt_version succeeded → reused=true, no new row.
 *     Sets queued lease deadline (queuedSeconds). One active analysis/owner.
 *   retry_repository_analysis(p_analysis_id) → new analysis UUID + usage row
 *     Linked via parent_analysis_id / parent_attempt_id. Counts as a new
 *     daily attempt. Checks monthly success cap. Previous costs stay.
 *     Allowed when prior is failed/cancelled or its lease/queued deadline
 *     expired. Marks an expired prior row cancelled before insert.
 *   cancel_repository_analysis(p_analysis_id) → void
 *   disconnect_github_connection() → void
 *     Rotates epoch, sets disconnected, deletes credentials, cancels
 *     non-terminal analyses. Owner portfolio_projects rows are kept.
 *   get_repository_analysis_usage_month() → AnalysisUsageMonth
 *
 * public, granted to anon + authenticated (visibility re-checked in-body):
 *   get_public_portfolio*: activity_visible = portfolio_activity_readable
 *     (section). GitHub rows are get_public_github_contributions only.
 *   get_public_github_contributions
 *   get_public_profile: open_to; blocked viewer → 0 rows; suspended →
 *     identity only (content/open_to nulled)
 *   get_public_post: context_label; 0 rows if private/hidden/suspended/blocked
 *
 * Table SELECT is owner-only for portfolio_projects, portfolio_settings,
 * github_contribution_days. Other users read published data through the
 * public RPCs above. Anon has no table grants.
 *
 * public, granted to service_role only (never anon/authenticated):
 *   upsert_github_connection(p_owner_id, p_github_user_id, p_github_login) → uuid
 *   upsert_github_contribution_day(p_connection_id, p_expected_epoch, p_date, p_count, p_level)
 *   mark_github_connection_status(p_connection_id, p_expected_epoch, p_status, p_safe_error)
 *     p_status is connected | reauthorization_needed only. Epoch must match.
 *   acquire_repository_analysis_lease — no takeover of an expired lease
 *   heartbeat / advance / commit — require p_worker_id + attempt + live
 *     unexpired lease + non-terminal status + connection status=connected
 *     + matching epoch. commit refuses an already-terminal row.
 *     advance must move exactly one stage forward.
 *   increment_portfolio_daily_metric(p_owner_id, p_project_id, p_kind, p_viewer_id)
 *     → boolean. NOT a public counter. Metrics API must dedup/rate-limit
 *     and check visibility, then call this with the resolved viewer id.
 *   record_portfolio_daily_metric_once(..., p_session_hash)
 *     → boolean. Service-only atomic receipt + increment. Bounded global
 *     expiry cleanup (64-row indexed batch) on each write.
 *   portfolio_publicly_readable_to(owner, viewer) — metrics helper only.
 *     Auth-bound wrapper portfolio_publicly_readable(owner) stays on
 *     anon/authenticated and is what public RPCs call.
 *   upsert_github_credentials / get_github_credentials / delete_github_credentials
 *     Public wrappers over private.github_credentials. Schema private is
 *     not exposed on PostgREST.
 *   finalize_repository_analysis — same args as commit including p_prompt_version.
 *     Returns project_id or null. succeeded → one private draft project from
 *     reserved analysis owner/repo/sha + validated draft JSON; personal_role
 *     null. failed|cancelled → no project. Replay same attempt returns existing
 *     project_id without overwrite. Project write fail rolls back commit+usage.
 *   replace_github_contribution_snapshot(connection, epoch, days, from, to)
 *     → days written. Official UTC window only: [today-364, today] = 365 dates.
 *     Complete unique coverage; missing ≠ 0. No owner arg. Prior snapshot
 *     kept on malformed input. Clears sync_cursor + last_sync_error.
 *
 * Worker writes against reauthorization_needed or disconnected fail with
 * github connection inactive.
 */
export type PortfolioRpcName =
  | "portfolio_analysis_caps"
  | "reserve_repository_analysis"
  | "retry_repository_analysis"
  | "cancel_repository_analysis"
  | "disconnect_github_connection"
  | "get_repository_analysis_usage_month"
  | "increment_portfolio_daily_metric"
  | "record_portfolio_daily_metric_once"
  | "get_public_portfolio"
  | "get_public_portfolio_projects"
  | "get_public_portfolio_experience"
  | "get_public_portfolio_education"
  | "get_public_github_contributions"
  | "upsert_github_connection"
  | "upsert_github_contribution_day"
  | "mark_github_connection_status"
  | "acquire_repository_analysis_lease"
  | "heartbeat_repository_analysis_lease"
  | "advance_repository_analysis_stage"
  | "commit_repository_analysis"
  | "finalize_repository_analysis"
  | "replace_github_contribution_snapshot"
  | "upsert_github_credentials"
  | "get_github_credentials"
  | "delete_github_credentials";
