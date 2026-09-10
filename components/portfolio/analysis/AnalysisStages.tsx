"use client";

import { Check } from "lucide-react";
import LoadingState from "@/components/landing/LoadingState";
import { stageRowStates } from "@/lib/portfolio/analysis-ui";
import type { AnalysisPresentation } from "@/lib/repository-analysis/status";

function StageMark({
  state,
  index,
}: {
  state: "pending" | "done" | "stopped";
  index: number;
}) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-blue-soft)] text-[var(--blue)]">
        <Check size={13} strokeWidth={1.5} aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center text-[11px] text-[var(--ink-muted)]">
      {index + 1}
    </span>
  );
}

export default function AnalysisStages({
  presented,
  reduceMotion,
  paused,
}: {
  presented: Pick<AnalysisPresentation, "kind"> & { status?: string };
  reduceMotion: boolean;
  paused: boolean;
}) {
  const rows = stageRowStates(presented);
  const motionLive = !reduceMotion && !paused;
  return (
    <ol className="flex flex-col gap-1">
      {rows.map((row, index) => (
        <li
          key={row.key}
          className="flex min-h-11 items-center gap-3 rounded-[0.75rem] px-2 transition-opacity duration-200"
          data-state={row.state}
        >
          {row.state === "active" ? (
            <div className="[&_.landing-loading-state]:mt-0">
              <LoadingState label={row.label} active={motionLive} />
            </div>
          ) : (
            <>
              <StageMark state={row.state} index={index} />
              <span className="text-sm text-[var(--ink)]">{row.label}</span>
              {row.state === "done" ? <span className="text-xs text-[var(--ink-faint)]">Done</span> : null}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
