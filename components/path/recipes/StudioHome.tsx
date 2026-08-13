import Link from "next/link";
import { signupCta } from "@/components/landing/cta";
import type { PathHomeData } from "../PathHome";
import PathHero from "../PathHero";
import {
  DossierStub,
  OpportunitiesStub,
  ProjectPlanStub,
  SkillStagesStub,
} from "../modules/stubs";

export default function StudioHome({
  plan,
  listings,
  context,
  nextTask,
  taskHref,
}: PathHomeData) {
  const project = context.project;
  const projectTasks = context.tasks
    .filter((task) => task.moduleId === "project_plan")
    .map((task) => ({ label: task.title, done: false }));
  const skill = context.skillStage;

  return (
    <div className="path-recipe path-recipe-studio">
      <PathHero plan={plan} nextTask={nextTask} taskHref={taskHref}>
        <Link href={project ? `/projects/${project.slug}` : "/home"} className={signupCta}>
          {project ? "Open assigned project" : "Review your path"}
        </Link>
      </PathHero>

      <div id="project-plan" className="path-workspace-grid path-workspace-studio">
        <ProjectPlanStub
          projectTitle={project?.title}
          projectSlug={project?.slug}
          checked={project?.checked}
          total={project?.total}
          tasks={projectTasks}
        />
        <DossierStub gaps={context.diagnosis?.gaps} />
        <SkillStagesStub
          track={skill?.track}
          stage={skill?.stage}
          description={skill?.description}
          next={skill?.nextSkill}
        />
        <OpportunitiesStub listings={listings} />
      </div>
    </div>
  );
}
