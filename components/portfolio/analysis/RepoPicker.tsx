"use client";

import { GitFork, Search } from "lucide-react";
import { filterPublicRepos, type PickerRepo } from "@/lib/portfolio/analysis-ui";

export default function RepoPicker({
  repositories,
  selectedId,
  onSelect,
  onAnalyze,
  busy,
  hasMore,
  onMore,
  loading,
  filter,
  onFilter,
}: {
  repositories: PickerRepo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAnalyze: () => void;
  busy?: boolean;
  hasMore?: boolean;
  onMore?: () => void;
  loading?: boolean;
  filter: string;
  onFilter: (value: string) => void;
}) {
  const visible = filterPublicRepos(repositories, filter);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-2 rounded-[0.75rem] border border-[var(--border)] bg-[var(--surface)] px-3">
        <Search size={16} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden />
        <input
          type="search"
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          placeholder="Filter loaded repositories"
          className="min-h-11 w-full bg-transparent text-sm text-[var(--ink)] outline-none"
        />
      </label>
      {loading ? (
        <p role="status" className="text-sm text-[var(--ink-muted)]">
          Loading public repositories…
        </p>
      ) : repositories.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">No public repositories available to this account.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">No repositories match this filter.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visible.map((repo) => (
            <li key={repo.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[0.75rem] px-2 text-sm hover:bg-[var(--accent-blue-soft)]">
                <input
                  type="radio"
                  name="repositoryId"
                  value={repo.id}
                  checked={selectedId === repo.id}
                  onChange={() => onSelect(repo.id)}
                />
                <span className="min-w-0 font-medium break-all text-[var(--ink)] [overflow-wrap:anywhere]">
                  {repo.fullName}
                </span>
                {repo.fork ? (
                  <span className="inline-flex items-center gap-1 text-[var(--ink-faint)]">
                    <GitFork size={14} strokeWidth={1.5} aria-hidden />
                    fork
                  </span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      )}
      {hasMore && onMore ? (
        <button type="button" className="btn-ghost min-h-11 self-start" onClick={onMore} disabled={busy || loading}>
          More
        </button>
      ) : null}
      <button
        type="button"
        className="btn-primary min-h-11 self-start"
        onClick={onAnalyze}
        disabled={busy || loading || selectedId == null}
      >
        Analyze project
      </button>
    </div>
  );
}
