import CompanyLogo from "@/components/ui/CompanyLogo";
import { formatDateRange, descriptionBullets } from "@/lib/experience-format";
import { schoolLogoUrl } from "@/lib/school-logo";
import type {
  PortfolioProject,
  PublicPortfolioEducation,
  PublicPortfolioExperience,
  PublicPortfolioProject,
} from "@/types/portfolio";
import ActivityBoard from "./ActivityBoard";
import OwnerProjectList from "./OwnerProjectList";
import ProjectCard from "./ProjectCard";
import OpenToTags from "./OpenToTags";
import type { GithubConnectionPublic, GithubContributionDay } from "@/types/portfolio";
import type { SamehereDay } from "@/lib/portfolio/activity";

export function IntroSection({
  bio,
  goals,
  openTo,
}: {
  bio: string | null;
  goals: string | null;
  openTo: readonly string[];
}) {
  if (!bio && !goals && openTo.length === 0) return null;
  return (
    <section className="card mt-4 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Introduction</h2>
      <OpenToTags tags={openTo} />
      {bio && (
        <p className="mt-3 max-w-[60ch] whitespace-pre-line break-words text-[17px] leading-[1.6] text-[var(--ink)]">
          {bio}
        </p>
      )}
      {goals && (
        <p className="mt-3 max-w-[60ch] whitespace-pre-line break-words text-[15px] leading-[1.6] text-[var(--ink-muted)]">
          {goals}
        </p>
      )}
    </section>
  );
}

const EXPERIENCE_GROUPS: { kind: string; label: string }[] = [
  { kind: "internship", label: "Internships" },
  { kind: "job", label: "Jobs" },
  { kind: "research", label: "Research" },
  { kind: "club_role", label: "Leadership & Clubs" },
];

export function ExperienceList({
  items,
  logos,
}: {
  items: PublicPortfolioExperience[];
  logos?: Map<string, string | null>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="card mt-4 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Experience</h2>
      <div className="mt-3 flex flex-col gap-5">
        {EXPERIENCE_GROUPS.map(({ kind, label }) => {
          const group = items
            .filter((exp) => exp.kind === kind)
            .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
          if (group.length === 0) return null;
          return (
            <div key={kind}>
              <p className="text-[10px] font-semibold tracking-wide text-[var(--ink-faint)] uppercase">{label}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {group.map((exp) => {
                  const dateRange = formatDateRange(exp.start_date, exp.end_date, exp.term);
                  const bullets = descriptionBullets(exp.note);
                  return (
                    <li key={exp.id} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
                      <CompanyLogo name={exp.org} logoUrl={logos?.get(exp.org.trim().toLowerCase()) ?? null} size="md" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-[var(--ink)]">{exp.role}</p>
                        <p className="text-sm text-[var(--ink-muted)]">{exp.org}</p>
                        {dateRange && <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{dateRange}</p>}
                        {bullets.length > 0 && (
                          <ul className="mt-1 list-disc pl-5 text-sm break-words whitespace-pre-line text-[var(--ink-muted)]">
                            {bullets.map((bullet) => (
                              <li key={bullet}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EducationList({
  items,
}: {
  items: Array<PublicPortfolioEducation & { school_domain?: string | null }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="card mt-4 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Education</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((edu) => {
          const dateRange = formatDateRange(edu.start_date, edu.end_date, null);
          const degreeLine = [edu.degree, edu.field, edu.class_year].filter(Boolean).join(", ");
          return (
            <li key={edu.id} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
              <CompanyLogo name={edu.school} logoUrl={schoolLogoUrl(edu.school_domain ?? null)} size="md" />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-[var(--ink)]">{edu.school}</p>
                {degreeLine && <p className="text-sm text-[var(--ink-muted)]">{degreeLine}</p>}
                {dateRange && <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{dateRange}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PublicProjectList({ projects }: { projects: PublicPortfolioProject[] }) {
  if (projects.length === 0) return null;
  return (
    <section className="mt-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Projects</h2>
      <ul className="flex flex-col gap-3">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} trackClicks />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ActivitySection({
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
  return (
    <div className="mt-4">
      <ActivityBoard
        samehere={samehere}
        github={github}
        connection={connection}
        streak={streak}
        isOwner={isOwner}
        samehereKnown={samehereKnown}
      />
    </div>
  );
}

export function OwnerProjects({
  projects,
  previewPublic,
}: {
  projects: PortfolioProject[];
  previewPublic: boolean;
}) {
  return <OwnerProjectList projects={projects} previewPublic={previewPublic} />;
}
