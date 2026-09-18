"use client";

import { Github, RefreshCw } from "lucide-react";
import type { GithubOwnerSeam } from "@/lib/github/seams";
import type { GithubStatusPayload } from "@/lib/portfolio/analysis-ui";

function syncedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

export default function ConnectionPanel({
  connection,
  seam,
  oauthAvailable,
  analysisAvailable,
  busy,
  onDisconnect,
  onRefresh,
}: {
  connection: GithubStatusPayload["connection"];
  seam: GithubOwnerSeam;
  oauthAvailable: boolean;
  analysisAvailable: boolean;
  busy?: boolean;
  onDisconnect?: () => void;
  onRefresh?: () => void;
}) {
  if (!oauthAvailable) {
    return (
      <p role="status" className="text-sm text-[var(--ink-muted)]">
        GitHub connection is unavailable.{" "}
        <a className="underline" href={seam.manualProjectHref}>
          Add a project manually
        </a>
        .
      </p>
    );
  }
  if (!connection) {
    return (
      <div className="flex flex-col gap-3">
        <a className="btn-primary inline-flex min-h-11 self-start" href={seam.connectHref}>
          <Github size={16} strokeWidth={1.5} aria-hidden />
          Connect GitHub
        </a>
        <p className="text-sm text-[var(--ink-muted)]">
          Or{" "}
          <a className="underline" href={seam.manualProjectHref}>
            add a project manually
          </a>
          .
        </p>
      </div>
    );
  }
  if (connection.status === "reauthorization_needed") {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="text-sm text-[var(--ink-muted)]">
          GitHub needs to be reconnected.
        </p>
        <a className="btn-primary inline-flex min-h-11 self-start" href={seam.connectHref}>
          <Github size={16} strokeWidth={1.5} aria-hidden />
          Reconnect
        </a>
      </div>
    );
  }
  const synced = syncedLabel(connection.last_synced_at);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--ink)]">
        Connected as <span className="font-medium">@{connection.github_login}</span>
        {!analysisAvailable ? " · analysis unavailable" : null}
        {synced ? <span className="text-[var(--ink-muted)]"> · activity saved {synced}</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {onRefresh ? (
          <button type="button" className="btn-ghost min-h-11" disabled={busy} onClick={onRefresh}>
            <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
            Refresh activity
          </button>
        ) : null}
        {onDisconnect ? (
          <button type="button" className="btn-ghost min-h-11" disabled={busy} onClick={onDisconnect}>
            Disconnect
          </button>
        ) : null}
      </div>
      <p className="text-xs text-[var(--ink-faint)]">
        Disconnect clears imported GitHub activity from your public profile. Written projects and private drafts stay.
      </p>
    </div>
  );
}
