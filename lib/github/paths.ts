import { authSuccessDest } from "@/lib/auth-dest";
import { DEFAULT_OAUTH_DEST } from "./config";

export function localReturnPath(next: string | null | undefined): string {
  return authSuccessDest(next ?? null, DEFAULT_OAUTH_DEST);
}

export function destWithGithubError(dest: string, error: string): string {
  const path = localReturnPath(dest);
  const url = new URL(path, "http://samehere.local");
  url.searchParams.set("github_error", error);
  return `${url.pathname}${url.search}`;
}
