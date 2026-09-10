"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ContributionHeatmap, { type HeatmapDay } from "@/components/profile/ContributionHeatmap";
import { MANUAL_PROJECT_PATH } from "@/lib/github/config";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import {
  activityHeadline,
  classifyGithubActivity,
  githubSnapshotKnown,
  mergeActivityDays,
  type ActivityFilter,
  type GithubActivityState,
  type SamehereDay,
} from "@/lib/portfolio/activity";
import type { GithubConnectionPublic, GithubContributionDay } from "@/types/portfolio";

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "github", label: "GitHub" },
  { id: "samehere", label: "Samehere" },
];

function intensityPoints(level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return 1;
  if (level === 2) return 4;
  return 8;
}

function snapshotDay(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  return new Date(time).toISOString().slice(0, 10);
}

function emptyValueLabel(filter: ActivityFilter): string {
  if (filter === "github") return "No GitHub contributions";
  if (filter === "samehere") return "No Samehere points";
  return "No activity";
}

function toHeatmap(filter: ActivityFilter, samehere: SamehereDay[], github: GithubContributionDay[]): HeatmapDay[] {
  return mergeActivityDays(samehere, github, filter).map((cell) => {
    const tooltipLines: string[] = [];
    if (filter !== "github" && cell.sameherePoints > 0) {
      tooltipLines.push(`Samehere: ${cell.sameherePoints} point${cell.sameherePoints === 1 ? "" : "s"}`);
    }
    if (filter !== "samehere" && cell.githubCount > 0) {
      tooltipLines.push(`GitHub: ${cell.githubCount} contribution${cell.githubCount === 1 ? "" : "s"}`);
    }
    const valueLabel =
      filter === "all"
        ? cell.sources.length === 0
          ? "No activity"
          : cell.sources.map((source) => (source === "samehere" ? "Samehere" : "GitHub")).join(" · ")
        : filter === "github"
          ? cell.githubCount === 0
            ? "No GitHub contributions"
            : `${cell.githubCount} GitHub contribution${cell.githubCount === 1 ? "" : "s"}`
          : cell.sameherePoints === 0
            ? "No Samehere points"
            : `${cell.sameherePoints} Samehere point${cell.sameherePoints === 1 ? "" : "s"}`;
    return {
      day: cell.date,
      points: intensityPoints(cell.intensity),
      breakdown: {},
      tooltipLines,
      valueLabel,
    };
  });
}

function GithubStateCopy({ state }: { state: GithubActivityState }) {
  if (state.kind === "forthcoming") {
    return <p className="text-sm text-[var(--ink-muted)]">GitHub isn’t connected yet.</p>;
  }
  if (state.kind === "pending") {
    return <p className="text-sm text-[var(--ink-muted)]">GitHub is still syncing.</p>;
  }
  if (state.kind === "unavailable") {
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        {state.status === "reauthorization_needed" ? "GitHub needs to be reconnected." : "GitHub is disconnected."}
      </p>
    );
  }
  if (state.kind === "empty") {
    return <p className="text-sm text-[var(--ink-muted)]">GitHub is connected, with no contributions yet.</p>;
  }
  if (state.kind === "stale") {
    const day = snapshotDay(state.lastSyncedAt);
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        {day ? `Showing the last saved GitHub activity from ${day}.` : "Showing the last saved GitHub activity."}
      </p>
    );
  }
  if (state.kind === "failed") {
    const day = state.lastSyncedAt ? snapshotDay(state.lastSyncedAt) : "";
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        Couldn’t refresh GitHub activity{day ? `. Last saved on ${day}` : ""}.
      </p>
    );
  }
  return null;
}

export default function ActivityBoard({
  samehere,
  github,
  connection,
  streak,
  isOwner,
  samehereKnown = true,
}: {
  samehere: SamehereDay[];
  github: GithubContributionDay[];
  connection: GithubConnectionPublic | null;
  streak: { current_streak: number; longest_streak: number; today_earned?: boolean } | null;
  isOwner: boolean;
  samehereKnown?: boolean;
}) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const reduceMotion = usePrefersReducedMotion();
  const state = classifyGithubActivity(connection, github);
  const githubKnown = githubSnapshotKnown(state);
  const cells = useMemo(() => toHeatmap(filter, samehere, github), [filter, samehere, github]);
  const headline = activityHeadline(filter, mergeActivityDays(samehere, github, filter), state, samehereKnown);
  const showChart =
    (filter === "all" && (samehereKnown || githubKnown)) ||
    (filter === "samehere" && samehereKnown) ||
    (filter === "github" && githubKnown);

  return (
    <section className="card p-5 sm:col-span-2 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Activity</h2>
          {isOwner ? (
            <Link href={MANUAL_PROJECT_PATH} className="text-sm text-[var(--ink-muted)] underline">
              Manage GitHub
            </Link>
          ) : null}
        </div>
        {filter === "samehere" && samehereKnown && streak && (streak.current_streak > 0 || streak.longest_streak > 0) && (
          <p className="text-sm text-[var(--ink-muted)]">
            <b className="font-semibold text-[var(--blue)]">{streak.current_streak}-day streak</b>
            {streak.longest_streak > streak.current_streak ? ` · best ${streak.longest_streak}` : ""}
          </p>
        )}
      </div>
      <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Activity source">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm ${
              filter === item.id
                ? "border-[var(--ink)] text-[var(--ink)]"
                : "border-[var(--border)] text-[var(--ink-muted)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-[var(--ink-muted)]">
        {headline.value === null ? (
          headline.label
        ) : (
          <>
            <b className="text-[var(--ink)]">{headline.value.toLocaleString()}</b> {headline.label}
          </>
        )}
      </p>
      {filter === "github" && <GithubStateCopy state={state} />}
      {!samehereKnown && filter === "samehere" && (
        <p className="text-sm text-[var(--ink-muted)]">Samehere activity isn’t available right now.</p>
      )}
      {showChart && (
        <ContributionHeatmap
          data={cells}
          animate={!reduceMotion}
          hideTotal
          emptyValueLabel={emptyValueLabel(filter)}
        />
      )}
      {isOwner && filter === "samehere" && samehereKnown && streak && streak.current_streak > 0 && !streak.today_earned && (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink-muted)]">
          Post today to keep your {streak.current_streak}-day streak.
        </p>
      )}
    </section>
  );
}
