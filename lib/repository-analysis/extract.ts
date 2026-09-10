import { apiEndpoint, githubFetch, githubJson, GithubHttpError } from "@/lib/github/http";
import { canonicalFullName } from "@/lib/github/repos";
import type { ResolvedPublicRepo } from "@/lib/github/repos";
import {
  EXTRACT_LIMITS,
  PRIORITY_FILE_NAMES,
  SKIP_DIR_NAMES,
  SKIP_EXTENSIONS,
  SKIP_FILE_NAMES,
  estimateTokens,
} from "./limits";

export type SampledFile = {
  path: string;
  text: string;
  bytes: number;
};

export type AnalysisCoverage = {
  repositoryId: number;
  fullName: string;
  commitSha: string;
  defaultBranch: string;
  fork: boolean;
  filesRead: number;
  fileLimit: number;
  bytesRead: number;
  byteLimit: number;
  sampledPaths: string[];
  skippedPaths: string[];
  partial: boolean;
  partialReasons: string[];
};

export type ExtractedRepository = {
  repo: ResolvedPublicRepo;
  files: SampledFile[];
  coverage: AnalysisCoverage;
};

type ContentEntry = {
  type?: string;
  name?: string;
  path?: string;
  size?: number;
  content?: string;
  encoding?: string;
};

export function canonicalRepoPath(raw: string): string | null {
  if (!raw || raw.includes("\0") || raw.includes("\\") || raw.includes("//")) return null;
  if (raw.startsWith("/") || raw.includes("://")) return null;
  const parts = raw.split("/").filter((part) => part.length > 0);
  if (parts.length === 0 || parts.some((part) => part === "." || part === ".." || part === ".git")) return null;
  if (parts.some((part) => /[\x00-\x1f]/.test(part))) return null;
  return parts.join("/");
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function shouldSkipPath(path: string): string | null {
  const parts = path.split("/");
  for (const part of parts.slice(0, -1)) {
    if (SKIP_DIR_NAMES.has(part)) return "vendor or generated directory";
  }
  const name = basename(path);
  const lower = name.toLowerCase();
  if (SKIP_FILE_NAMES.has(lower)) return "lockfile or credential file";
  if (lower.startsWith(".env")) return "credential file";
  if (lower.endsWith(".pem") || lower.endsWith(".key") || lower.includes("id_rsa")) return "credential file";
  const ext = lower.includes(".") ? `.${lower.split(".").pop()}` : "";
  if (ext && SKIP_EXTENSIONS.has(ext)) return "binary or generated file";
  if (lower.endsWith(".min.js") || lower.endsWith(".min.css")) return "generated file";
  return null;
}

function priorityRank(path: string): number {
  const name = basename(path).toLowerCase();
  const index = PRIORITY_FILE_NAMES.indexOf(name);
  if (index >= 0) return index;
  if (path.startsWith("src/") || path.startsWith("app/") || path.startsWith("lib/")) return 40;
  return 80;
}

function decodeFileContent(entry: ContentEntry, maxBytes: number): string | null {
  if (entry.encoding !== "base64" || typeof entry.content !== "string") return null;
  const buf = Buffer.from(entry.content.replace(/\n/g, ""), "base64");
  if (buf.includes(0)) return null;
  const slice = buf.subarray(0, maxBytes);
  const text = slice.toString("utf8");
  if (text.includes("\uFFFD") && slice.length > 0) return null;
  return text;
}

export function requestKeyFor(repoId: number, sha: string, promptVersion: string): string {
  return `repo:${repoId}:sha:${sha}:pv:${promptVersion}`;
}

export async function extractPublicRepository(input: {
  token: string;
  repo: ResolvedPublicRepo;
  signal?: AbortSignal;
  remainingMs?: () => number;
  fetchImpl?: typeof fetch;
}): Promise<ExtractedRepository> {
  const parsed = canonicalFullName(input.repo.fullName);
  if (!parsed) throw new Error("invalid repository name");
  if (input.repo.commitSha !== input.repo.commitSha.toLowerCase() || !/^[0-9a-f]{40}$/.test(input.repo.commitSha)) {
    throw new Error("invalid commit sha");
  }

  const skipped: string[] = [];
  const reasons = new Set<string>();
  const files: SampledFile[] = [];
  let bytesRead = 0;
  let tokens: number = EXTRACT_LIMITS.reservedPromptTokens;
  let dirRequests = 0;

  const queue: string[] = [""];
  const seen = new Set<string>();
  let stopped = false;

  while (!stopped && queue.length > 0 && dirRequests < EXTRACT_LIMITS.maxDirRequests && files.length < EXTRACT_LIMITS.maxFiles) {
    const dir = queue.shift() as string;
    dirRequests += 1;
    let entries: ContentEntry[];
    try {
      entries = await listDir({
        token: input.token,
        owner: parsed.owner,
        name: parsed.name,
        dir,
        sha: input.repo.commitSha,
        fetchImpl: input.fetchImpl,
        signal: input.signal,
        remainingMs: input.remainingMs,
      });
    } catch (error) {
      if (error instanceof GithubHttpError && error.kind === "oversize") {
        reasons.add("directory listing truncated");
        continue;
      }
      throw error;
    }
    const ranked = [...entries].sort((a, b) => priorityRank(a.path ?? a.name ?? "") - priorityRank(b.path ?? b.name ?? ""));
    for (const entry of ranked) {
      if (files.length >= EXTRACT_LIMITS.maxFiles) {
        reasons.add("file cap");
        stopped = true;
        break;
      }
      if (entry.type === "symlink" || entry.type === "submodule") {
        skipped.push(entry.path ?? entry.name ?? "symlink");
        reasons.add("symlink or submodule skipped");
        continue;
      }
      if (entry.type === "dir") {
        const path = canonicalRepoPath(entry.path ?? "");
        if (!path || seen.has(path)) continue;
        if (SKIP_DIR_NAMES.has(basename(path))) {
          skipped.push(path);
          continue;
        }
        seen.add(path);
        queue.push(path);
        continue;
      }
      if (entry.type !== "file") continue;
      const path = canonicalRepoPath(entry.path ?? "");
      if (!path || seen.has(path)) {
        if (entry.path) skipped.push(entry.path);
        reasons.add("invalid path");
        continue;
      }
      seen.add(path);
      const skip = shouldSkipPath(path);
      if (skip) {
        skipped.push(path);
        continue;
      }
      if (typeof entry.size === "number" && entry.size > EXTRACT_LIMITS.maxBytesPerFile) {
        skipped.push(path);
        reasons.add("file over 32 KiB");
        continue;
      }
      if (bytesRead >= EXTRACT_LIMITS.maxBytesTotal) {
        reasons.add("byte cap");
        stopped = true;
        break;
      }
      const remainingBytes = Math.min(EXTRACT_LIMITS.maxBytesPerFile, EXTRACT_LIMITS.maxBytesTotal - bytesRead);
      const file = await readFile({
        token: input.token,
        owner: parsed.owner,
        name: parsed.name,
        path,
        sha: input.repo.commitSha,
        maxBytes: remainingBytes,
        fetchImpl: input.fetchImpl,
        signal: input.signal,
        remainingMs: input.remainingMs,
      });
      if (!file) {
        skipped.push(path);
        continue;
      }
      const nextTokens = tokens + estimateTokens(file.text);
      if (nextTokens > EXTRACT_LIMITS.maxInputTokens) {
        reasons.add("token budget");
        skipped.push(path);
        stopped = true;
        break;
      }
      files.push(file);
      bytesRead += file.bytes;
      tokens = nextTokens;
    }
  }
  if (queue.length > 0 || dirRequests >= EXTRACT_LIMITS.maxDirRequests) reasons.add("tree walk bounded");

  files.sort((a, b) => priorityRank(a.path) - priorityRank(b.path) || a.path.localeCompare(b.path));

  const coverage: AnalysisCoverage = {
    repositoryId: input.repo.id,
    fullName: input.repo.fullName,
    commitSha: input.repo.commitSha,
    defaultBranch: input.repo.defaultBranch,
    fork: input.repo.fork,
    filesRead: files.length,
    fileLimit: EXTRACT_LIMITS.maxFiles,
    bytesRead,
    byteLimit: EXTRACT_LIMITS.maxBytesTotal,
    sampledPaths: files.map((file) => file.path),
    skippedPaths: skipped.slice(0, 40),
    partial: reasons.size > 0 || files.length === 0,
    partialReasons: [...reasons],
  };
  if (files.length === 0) coverage.partialReasons = [...new Set([...coverage.partialReasons, "no readable text files"])];

  return { repo: input.repo, files, coverage };
}

function requestTimeoutMs(remainingMs?: () => number): number {
  if (!remainingMs) return EXTRACT_LIMITS.requestTimeoutMs;
  const left = remainingMs();
  if (left <= 0) throw new GithubHttpError("GitHub request timed out.", 504, "timeout");
  return Math.min(EXTRACT_LIMITS.requestTimeoutMs, left);
}

async function listDir(input: {
  token: string;
  owner: string;
  name: string;
  dir: string;
  sha: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  remainingMs?: () => number;
}): Promise<ContentEntry[]> {
  const suffix = input.dir ? `/${input.dir.split("/").map(encodeURIComponent).join("/")}` : "";
  const { text } = await githubFetch(apiEndpoint(`/repos/${input.owner}/${input.name}/contents${suffix}?ref=${input.sha}`), {
    timeoutMs: requestTimeoutMs(input.remainingMs),
    maxBytes: EXTRACT_LIMITS.metadataMaxBytes,
    token: input.token,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  const json = githubJson<ContentEntry[] | ContentEntry>(text);
  const rows = Array.isArray(json) ? json : [json];
  return rows.slice(0, EXTRACT_LIMITS.maxDirEntries);
}

async function readFile(input: {
  token: string;
  owner: string;
  name: string;
  path: string;
  sha: string;
  maxBytes: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  remainingMs?: () => number;
}): Promise<SampledFile | null> {
  const encoded = input.path.split("/").map(encodeURIComponent).join("/");
  const { text } = await githubFetch(apiEndpoint(`/repos/${input.owner}/${input.name}/contents/${encoded}?ref=${input.sha}`), {
    timeoutMs: requestTimeoutMs(input.remainingMs),
    maxBytes: EXTRACT_LIMITS.fileResponseMaxBytes,
    token: input.token,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  const entry = githubJson<ContentEntry>(text);
  if (entry.type !== "file") return null;
  const decoded = decodeFileContent(entry, input.maxBytes);
  if (decoded === null) return null;
  return { path: input.path, text: decoded, bytes: Buffer.byteLength(decoded) };
}
