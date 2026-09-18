import type { GithubConnectionPublic, GithubContributionDay } from "@/types/portfolio";
import {
  DEFAULT_OAUTH_DEST,
  GITHUB_CALLBACK_PATH,
  GITHUB_CONNECT_PATH,
  GITHUB_REFRESH_PATH,
  GITHUB_REPOS_PATH,
  GITHUB_STATUS_PATH,
  MANUAL_PROJECT_PATH,
} from "./config";
import { destWithGithubError, localReturnPath } from "./paths";

export {
  GITHUB_CALLBACK_PATH,
  GITHUB_CONNECT_PATH,
  GITHUB_REFRESH_PATH,
  GITHUB_REPOS_PATH,
  GITHUB_STATUS_PATH,
  MANUAL_PROJECT_PATH,
};

export function githubConnectHref(next = DEFAULT_OAUTH_DEST): string {
  const dest = localReturnPath(next);
  return `${GITHUB_CONNECT_PATH}?next=${encodeURIComponent(dest)}`;
}

export function githubErrorDest(next: string, error: string): string {
  return destWithGithubError(next, error);
}

/** Portfolio activity UI: typed public days + connection flags. Do not sum with Samehere points. */
export type GithubActivitySeam = {
  connection: Pick<GithubConnectionPublic, "status" | "last_synced_at" | "last_sync_error"> | null;
  days: GithubContributionDay[];
};

export type GithubOwnerSeam = {
  connectHref: string;
  statusHref: typeof GITHUB_STATUS_PATH;
  reposHref: typeof GITHUB_REPOS_PATH;
  refreshHref: typeof GITHUB_REFRESH_PATH;
  disconnectHref: typeof GITHUB_CONNECT_PATH;
  manualProjectHref: typeof MANUAL_PROJECT_PATH;
};

export function githubOwnerSeam(next = DEFAULT_OAUTH_DEST): GithubOwnerSeam {
  return {
    connectHref: githubConnectHref(next),
    statusHref: GITHUB_STATUS_PATH,
    reposHref: GITHUB_REPOS_PATH,
    refreshHref: GITHUB_REFRESH_PATH,
    disconnectHref: GITHUB_CONNECT_PATH,
    manualProjectHref: MANUAL_PROJECT_PATH,
  };
}
