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
      className={`landing-demo-panel path-module-panel${demoted ? " opacity-70" : ""}`}
      aria-labelledby={`module-${id}`}
    >
      <header className="path-module-header">
        <h2 id={`module-${id}`}>{title ?? LABELS[id]}</h2>
      </header>
      <div className="path-module-body">{children}</div>
    </section>
  );
}
