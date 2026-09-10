export const ANALYSIS_PROMPT_VERSION = "repo-analysis-v1";

export const EXTRACT_LIMITS = {
  maxFiles: 30,
  maxBytesPerFile: 32 * 1024,
  maxBytesTotal: 200 * 1024,
  maxInputTokens: 12_000,
  maxOutputTokens: 4_000,
  reservedPromptTokens: 1_800,
  maxDirRequests: 8,
  maxDirEntries: 80,
  requestTimeoutMs: 12_000,
  metadataMaxBytes: 96_000,
  fileResponseMaxBytes: 48_000,
} as const;

export const PROCESSOR_DEADLINE_MS = 90_000;
export const MIN_MODEL_BUDGET_MS = 8_000;
export const ROUTE_MAX_DURATION_SECONDS = 120;
export const LEASE_TTL_SECONDS = 90;

export const SKIP_DIR_NAMES = new Set([
  ".git",
  ".github",
  ".hg",
  ".svn",
  ".next",
  ".turbo",
  ".cache",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "coverage",
  "target",
  "__pycache__",
  "Pods",
  "DerivedData",
]);

export const SKIP_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "cargo.lock",
  "poetry.lock",
  "composer.lock",
  "gemfile.lock",
  "go.sum",
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "secrets.json",
]);

export const SKIP_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".woff",
  ".woff2",
  ".ttf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".wasm",
  ".mp4",
  ".mp3",
  ".lock",
  ".min.js",
  ".map",
  ".pem",
  ".p12",
  ".pfx",
  ".key",
  ".keystore",
]);

export const PRIORITY_FILE_NAMES = [
  "readme.md",
  "readme",
  "readme.rst",
  "package.json",
  "pyproject.toml",
  "cargo.toml",
  "go.mod",
  "composer.json",
  "gemfile",
  "pom.xml",
  "build.gradle",
];

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
