import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PORTFOLIO_SECTIONS } from "./validation";
import { httpUrlError } from "./validation";
import type { PortfolioSection } from "@/types/portfolio";
import { orderedSections } from "./projection";

export const METRICS_SESSION_COOKIE = "sh_pf_sid";
export const PORTFOLIO_METRICS_SECRET_ENV = "PORTFOLIO_METRICS_SECRET";
export const METRICS_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const METRICS_RECEIPT_TTL_DAYS = 2;
export const METRIC_BODY_MAX_BYTES = 1024;
// ponytail: per-process Map. Multi-instance is best-effort; exact unique visitors are not implied.
export const METRIC_RATE_MAX = 40;
export const METRIC_RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_BUCKET_CAP = 4000;

const USERNAME_RE = /^[A-Za-z0-9_]{1,32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|twitterbot|semrush|ahrefs|applebot|pingdom|preview/i;

export type MetricViewEvent = { kind: "view"; username: string };
export type MetricClickEvent = { kind: "click"; projectId: string; clickKind: "repo" | "demo" };
export type MetricEvent = MetricViewEvent | MetricClickEvent;

export type MetricRow = {
  owner_id: string;
  project_id: string | null;
  metric_date: string;
  view_count: number;
  click_count: number;
};

export type MetricSummary = {
  views: number;
  linkClicks: number;
  perProject: { projectId: string; clicks: number }[];
};

type RateBucket = { n: number; reset: number };
const rateBuckets = new Map<string, RateBucket>();

export function parseMetricBody(body: unknown): MetricEvent | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const keys = Object.keys(raw);
  if (keys.some((key) => ["viewerId", "viewer_id", "userId", "href", "url", "redirect"].includes(key))) {
    return null;
  }
  if (typeof raw.username === "string") {
    if (keys.some((key) => key !== "username")) return null;
    const username = raw.username.trim();
    if (!USERNAME_RE.test(username)) return null;
    return { kind: "view", username };
  }
  if (typeof raw.projectId === "string" && (raw.clickKind === "repo" || raw.clickKind === "demo")) {
    if (keys.some((key) => key !== "projectId" && key !== "clickKind")) return null;
    if (!UUID_RE.test(raw.projectId)) return null;
    return { kind: "click", projectId: raw.projectId, clickKind: raw.clickKind };
  }
  return null;
}

export function sameOriginRequest(request: Request, expectedHost: string): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === expectedHost;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).host === expectedHost;
  } catch {
    return false;
  }
}

export function requestHost(request: Request): string {
  try {
    return new URL(request.url).host;
  } catch {
    return "";
  }
}

export function privacyOptOut(headers: Record<string, string>, cookieHeader: string): boolean {
  const gpc = headers["sec-gpc"] ?? headers["Sec-GPC"];
  const dnt = headers["dnt"] ?? headers["DNT"];
  if (gpc === "1" || dnt === "1") return true;
  return /(?:^|;\s*)ph_optout=1(?:;|$)/i.test(cookieHeader);
}

export function requestPrivacyOptOut(request: Request): boolean {
  return privacyOptOut(
    {
      "sec-gpc": request.headers.get("sec-gpc") ?? "",
      dnt: request.headers.get("dnt") ?? "",
    },
    request.headers.get("cookie") ?? ""
  );
}

export function isBotUserAgent(ua: string | null | undefined): boolean {
  return Boolean(ua && BOT_UA.test(ua));
}

export function metricsSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env[PORTFOLIO_METRICS_SECRET_ENV]?.trim();
  return secret ? secret : null;
}

export function newMetricSessionId(): string {
  return randomBytes(16).toString("base64url");
}

export function signMetricSession(id: string, exp: number, secret: string): string {
  const payload = `${id}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyMetricSession(
  token: string | undefined,
  secret: string,
  nowSeconds: number
): { id: string; exp: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!id || !Number.isInteger(exp) || exp <= nowSeconds) return null;
  const expected = createHmac("sha256", secret).update(`${id}.${exp}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id, exp };
}

export function sessionHash(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}

export function readMetricSessionCookie(cookieHeader: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${METRICS_SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

export function trustedClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first.length > 0 && first.length < 80) return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real && real.length > 0 && real.length < 80) return real;
  return null;
}

export function abuseRateKey(secret: string, ip: string | null, nowMs: number): string {
  const window = Math.floor(nowMs / METRIC_RATE_WINDOW_MS);
  const digest = createHmac("sha256", secret).update(`${window}:${ip ?? "missing"}`).digest("hex");
  return `abuse:${digest}`;
}

export async function readCappedJson(request: Request, maxBytes = METRIC_BODY_MAX_BYTES): Promise<unknown | undefined> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return undefined;
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return undefined;
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return undefined;
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(buf)) as unknown;
  } catch {
    return undefined;
  }
}

export function takeMetricRateSlot(sessionKey: string, nowMs: number): boolean {
  const current = rateBuckets.get(sessionKey);
  if (!current || current.reset <= nowMs) {
    if (rateBuckets.size >= RATE_BUCKET_CAP) {
      const first = rateBuckets.keys().next().value;
      if (first) rateBuckets.delete(first);
    }
    rateBuckets.set(sessionKey, { n: 1, reset: nowMs + METRIC_RATE_WINDOW_MS });
    return true;
  }
  if (current.n >= METRIC_RATE_MAX) return false;
  current.n += 1;
  return true;
}

export function resetMetricRateLimitForTests(): void {
  rateBuckets.clear();
}

export function resolveClickUrl(
  project: { repo_url: string | null; demo_url: string | null },
  clickKind: "repo" | "demo"
): string | null {
  const href = clickKind === "repo" ? project.repo_url : project.demo_url;
  if (!href || httpUrlError("Link", href)) return null;
  return href;
}

export function hasRenderedPublicContent(row: {
  publish_intro?: boolean;
  publish_projects?: boolean;
  publish_experience?: boolean;
  publish_education?: boolean;
  publish_posts?: boolean;
  activity_visible?: boolean;
  publish_activity?: boolean;
}): boolean {
  return Boolean(
    row.publish_intro ||
      row.publish_projects ||
      row.activity_visible ||
      row.publish_experience ||
      row.publish_education ||
      row.publish_posts
  );
}

export function eligiblePublicView(opts: {
  isOwner: boolean;
  previewPublic: boolean;
  isPrivate: boolean;
  isBlocked: boolean;
  isSuspended: boolean;
  hasRenderedPublicContent: boolean;
}): boolean {
  return (
    !opts.isOwner &&
    !opts.previewPublic &&
    !opts.isPrivate &&
    !opts.isBlocked &&
    !opts.isSuspended &&
    opts.hasRenderedPublicContent
  );
}

export function effectiveSectionOrder(
  saved: readonly string[] | null | undefined,
  currentPro: boolean
): PortfolioSection[] {
  if (!currentPro) return [...PORTFOLIO_SECTIONS];
  return orderedSections(saved ?? []);
}

export function summarizeMetrics(rows: MetricRow[]): MetricSummary {
  let views = 0;
  let linkClicks = 0;
  const clicks = new Map<string, number>();
  for (const row of rows) {
    views += row.view_count;
    linkClicks += row.click_count;
    if (row.project_id) {
      clicks.set(row.project_id, (clicks.get(row.project_id) ?? 0) + row.click_count);
    }
  }
  const perProject = [...clicks.entries()]
    .map(([projectId, projectClicks]) => ({ projectId, clicks: projectClicks }))
    .filter((row) => row.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks || a.projectId.localeCompare(b.projectId));
  return { views, linkClicks, perProject };
}

export function metricWindowStart(now = new Date()): string {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 29);
  return start.toISOString().slice(0, 10);
}
