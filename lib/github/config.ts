export const GITHUB_AUTHORIZE_PATH = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_PATH = "https://github.com/login/oauth/access_token";
export const GITHUB_API_ORIGIN = "https://api.github.com";
export const GITHUB_LOGIN_ORIGIN = "https://github.com";
export const GITHUB_CONTENT_ORIGINS = new Set(["api.github.com", "github.com"]);

export const GITHUB_OAUTH_COOKIE = "sh_gh_oauth";
export const GITHUB_OAUTH_TTL_SECONDS = 600;
export const GITHUB_OAUTH_SCOPE = "read:user";

export const GITHUB_CONNECT_PATH = "/api/integrations/github";
export const GITHUB_CALLBACK_PATH = "/api/integrations/github/callback";
export const GITHUB_STATUS_PATH = "/api/integrations/github/status";
export const GITHUB_REPOS_PATH = "/api/integrations/github/repos";
export const GITHUB_REFRESH_PATH = "/api/integrations/github/refresh";
export const MANUAL_PROJECT_PATH = "/profile/projects/new";
export const DEFAULT_OAUTH_DEST = MANUAL_PROJECT_PATH;

export const GITHUB_CREDENTIALS_KEY_ENV = "GITHUB_CREDENTIALS_KEY";
export const GITHUB_CREDENTIALS_KEY_VERSION_ENV = "GITHUB_CREDENTIALS_KEY_VERSION";
export const GITHUB_CLIENT_ID_ENV = "GITHUB_CLIENT_ID";
export const GITHUB_CLIENT_SECRET_ENV = "GITHUB_CLIENT_SECRET";
export const GITHUB_OAUTH_CALLBACK_URL_ENV = "GITHUB_OAUTH_CALLBACK_URL";
export const GITHUB_ANALYSIS_ENABLED_ENV = "GITHUB_ANALYSIS_ENABLED";
export const GITHUB_ANALYSIS_MODEL_ENV = "GITHUB_ANALYSIS_MODEL";
export const GITHUB_SYNC_BATCH_LIMIT_ENV = "GITHUB_SYNC_BATCH_LIMIT";
export const GITHUB_ANALYSIS_USD_PER_INPUT_TOKEN_ENV = "GITHUB_ANALYSIS_USD_PER_INPUT_TOKEN";
export const GITHUB_ANALYSIS_USD_PER_OUTPUT_TOKEN_ENV = "GITHUB_ANALYSIS_USD_PER_OUTPUT_TOKEN";

export const DEFAULT_SYNC_BATCH_LIMIT = 10;
export const DEFAULT_REFRESH_THROTTLE_MS = 10 * 60 * 1000;

export function envFlagEnabled(value: string | undefined, fallback = true): boolean {
  if (value === undefined || value === "") return fallback;
  return value !== "0" && value.toLowerCase() !== "false";
}

export function readKeyVersion(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function githubOAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env[GITHUB_CLIENT_ID_ENV]?.trim() &&
      env[GITHUB_CLIENT_SECRET_ENV]?.trim() &&
      env[GITHUB_OAUTH_CALLBACK_URL_ENV]?.trim() &&
      env[GITHUB_CREDENTIALS_KEY_ENV]?.trim()
  );
}

export function githubAnalysisConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!envFlagEnabled(env[GITHUB_ANALYSIS_ENABLED_ENV], true)) return false;
  const model = env[GITHUB_ANALYSIS_MODEL_ENV]?.trim() || env.OPENAI_MODEL?.trim();
  return Boolean(env.OPENAI_API_KEY?.trim() && model);
}

export function githubAnalysisModel(env: NodeJS.ProcessEnv = process.env): string | null {
  const model = env[GITHUB_ANALYSIS_MODEL_ENV]?.trim() || env.OPENAI_MODEL?.trim();
  return model || null;
}

export type EnvRecord = Record<string, string | undefined>;

export function configuredTokenRates(env: EnvRecord = process.env): {
  input: number;
  output: number;
} | null {
  const input = Number.parseFloat(env[GITHUB_ANALYSIS_USD_PER_INPUT_TOKEN_ENV] ?? "");
  const output = Number.parseFloat(env[GITHUB_ANALYSIS_USD_PER_OUTPUT_TOKEN_ENV] ?? "");
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return null;
  return { input, output };
}

export function githubSyncBatchLimit(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env[GITHUB_SYNC_BATCH_LIMIT_ENV] ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_SYNC_BATCH_LIMIT;
  return Math.min(parsed, 50);
}

export function isGithubCredentialsKeyError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(GITHUB_CREDENTIALS_KEY_ENV);
}

export function credentialsAad(ownerId: string, connectionId: string, keyVersion: number): string {
  return `github-credentials:v${keyVersion}:${ownerId}:${connectionId}`;
}

export function oauthStateAad(keyVersion: number): string {
  return `github-oauth-state:v${keyVersion}`;
}
