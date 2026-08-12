import type { ReactNode } from "react";
import type { ModuleId } from "@/lib/path/types";

const LABELS: Record<ModuleId, string> = {
  dossier: "Dossier",
  opportunities: "Opportunities",
  applications: "Applications",
  pitch: "Pitch",
  project_plan: "Project plan",
  interview_prep: "Interview prep",
  helpers: "Helpers",
  skill_stages: "Skill stages",
};

export default function ModuleSection({
  id,
  title,
  children,
  demoted = false,
}: {
  id: ModuleId;
  title?: string;
  children: ReactNode;
  demoted?: boolean;
}) {
  return (
    <section
      data-module={id}
      className={demoted ? "opacity-70" : undefined}
      aria-labelledby={`module-${id}`}
    >
      <h2
        id={`module-${id}`}
        className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]"
      >
        {title ?? LABELS[id]}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
