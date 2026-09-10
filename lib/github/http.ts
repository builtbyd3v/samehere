import {
  GITHUB_API_ORIGIN,
  GITHUB_CONTENT_ORIGINS,
  GITHUB_LOGIN_ORIGIN,
  GITHUB_TOKEN_PATH,
} from "./config";

export const GITHUB_API_VERSION = "2022-11-28";
export const GITHUB_USER_AGENT = "samehere-portfolio";

export class GithubHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: "rate_limit" | "reauth" | "not_found" | "private" | "timeout" | "oversize" | "redirect" | "http"
  ) {
    super(message);
  }
}

export function officialGithubUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.username || url.password) throw new GithubHttpError("Invalid GitHub URL.", 400, "redirect");
  if (url.protocol !== "https:") throw new GithubHttpError("Invalid GitHub URL.", 400, "redirect");
  if (!GITHUB_CONTENT_ORIGINS.has(url.hostname)) {
    throw new GithubHttpError("Refusing non-official GitHub host.", 400, "redirect");
  }
  if (url.hostname === "github.com" && url.pathname !== "/login/oauth/access_token") {
    throw new GithubHttpError("Refusing non-official GitHub path.", 400, "redirect");
  }
  return url;
}

export async function readLimitedBody(res: Response, maxBytes: number, timeoutMs: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (Buffer.byteLength(text) > maxBytes) throw new GithubHttpError("GitHub response too large.", 413, "oversize");
    return text;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  const deadline = Date.now() + timeoutMs;
  while (true) {
    if (Date.now() > deadline) {
      await reader.cancel();
      throw new GithubHttpError("GitHub response timed out.", 504, "timeout");
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new GithubHttpError("GitHub response too large.", 413, "oversize");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function githubFetch(
  rawUrl: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs: number;
    maxBytes: number;
    token?: string;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  }
): Promise<{ status: number; headers: Headers; text: string }> {
  if (init.signal?.aborted) throw new GithubHttpError("GitHub request timed out.", 504, "timeout");
  const url = officialGithubUrl(rawUrl);
  const headers: Record<string, string> = {
    Accept: url.href === GITHUB_TOKEN_PATH || url.origin === GITHUB_LOGIN_ORIGIN
      ? "application/json"
      : "application/vnd.github+json",
    "User-Agent": GITHUB_USER_AGENT,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    ...init.headers,
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const timeout = AbortSignal.timeout(init.timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    const res = await (init.fetchImpl ?? fetch)(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body,
      redirect: "manual",
      signal,
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new GithubHttpError("GitHub redirected without a location.", res.status, "redirect");
      officialGithubUrl(new URL(location, url).toString());
      throw new GithubHttpError("GitHub redirect must be re-resolved.", res.status, "redirect");
    }
    const text = await readLimitedBody(res, init.maxBytes, init.timeoutMs);
    if (res.status === 401 || res.status === 403 && /bad credentials|requires authentication|token expired|revoked/i.test(text)) {
      throw new GithubHttpError("GitHub access was revoked.", res.status, "reauth");
    }
    if (res.status === 403 || res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      throw new GithubHttpError(retryAfter ? `rate-limit:${retryAfter}` : "GitHub rate limited this request.", res.status, "rate_limit");
    }
    if (res.status === 404) throw new GithubHttpError("GitHub resource not found.", 404, "not_found");
    if (res.status >= 400) throw new GithubHttpError("GitHub request failed.", res.status, "http");
    return { status: res.status, headers: res.headers, text };
  } catch (error) {
    if (error instanceof GithubHttpError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GithubHttpError("GitHub request timed out.", 504, "timeout");
    }
    throw error;
  }
}

export function githubJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

export function graphqlEndpoint(): string {
  return `${GITHUB_API_ORIGIN}/graphql`;
}

export function apiEndpoint(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  return `${GITHUB_API_ORIGIN}${trimmed}`;
}

export function retryAfterMs(error: GithubHttpError, fallbackMs: number): number {
  const match = /^rate-limit:(\d+)$/.exec(error.message);
  if (!match) return fallbackMs;
  const seconds = Number.parseInt(match[1], 10);
  return Number.isFinite(seconds) ? Math.min(seconds * 1000, 60 * 60 * 1000) : fallbackMs;
}
