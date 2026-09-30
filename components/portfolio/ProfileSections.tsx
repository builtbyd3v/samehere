import CompanyLogo from "@/components/ui/CompanyLogo";
import { SectionLabel } from "@/components/ui/SectionLabel";
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
import StudyModeChip from "./StudyModeChip";
import type { GithubConnectionPublic, GithubContributionDay } from "@/types/portfolio";
import type { SamehereDay } from "@/lib/portfolio/activity";

export function IntroSection({
  bio,
  goals,
  studyMode,
}: {
  bio: string | null;
  goals: string | null;
  studyMode?: string | null;
}) {
  if (!bio && !goals && !studyMode) return null;
  return (
    <section className="flex flex-col gap-4">
      <SectionLabel as="h2">About</SectionLabel>
      {bio && (
        <p className="max-w-[60ch] whitespace-pre-line break-words text-pretty text-lg leading-[1.45] tracking-[-0.01em] text-[var(--ink-2)] md:text-title">
          {bio}
        </p>
      )}
      {goals && (
        <p className="max-w-[60ch] whitespace-pre-line break-words text-pretty text-body leading-[1.6] text-[var(--muted)]">
          {goals}
        </p>
      )}
      {studyMode && (
        <div>
          <StudyModeChip mode={studyMode} />
        </div>
      )}
    </section>
  );
}

type TimelineRow = {
  key: string;
  when: string | null;
  title: string;
  where: string | null;
  logo: { name: string; url: string | null };
  bullets: string[];
};

// ponytail: the old per-kind groups ("Internships", "Leadership & Clubs") collapse into one dated list; restore a kind label only if the maintainer asks.
export function ResumeTimeline({
  experience,
  education,
  logos,
}: {
  experience: PublicPortfolioExperience[];
  education: Array<PublicPortfolioEducation & { school_domain?: string | null }>;
  logos?: Map<string, string | null>;
}) {
  if (experience.length === 0 && education.length === 0) return null;
  const heading =
    experience.length > 0 && education.length > 0
      ? "Experience and education"
      : experience.length > 0
        ? "Experience"
        : "Education";
  const rows: TimelineRow[] = [
    ...[...experience]
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""))
      .map((exp) => ({
        key: `exp-${exp.id}`,
        when: formatDateRange(exp.start_date, exp.end_date, exp.term),
        title: exp.role,
        where: exp.org,
        logo: { name: exp.org, url: logos?.get(exp.org.trim().toLowerCase()) ?? null },
        bullets: descriptionBullets(exp.note),
      })),
    ...education.map((edu) => {
      const title = [edu.degree, edu.field].filter(Boolean).join(" ") || edu.school;
      return {
        key: `edu-${edu.id}`,
        when: formatDateRange(edu.start_date, edu.end_date, null) ?? (edu.class_year ? `Class of ${edu.class_year}` : null),
        title,
        where: edu.school === title ? null : edu.school,
        logo: { name: edu.school, url: schoolLogoUrl(edu.school_domain ?? null) },
        bullets: [],
      };
    }),
  ];
  return (
    <section>
      <SectionLabel as="h2" className="mb-3">
        {heading}
      </SectionLabel>
      <ul>
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid gap-1 border-t border-[var(--hairline)] py-4 md:grid-cols-[140px_minmax(0,1fr)] md:gap-6"
          >
            <span className="text-small tabular-nums text-[var(--muted)]">{row.when}</span>
            <div className="flex min-w-0 gap-3">
              <CompanyLogo name={row.logo.name} logoUrl={row.logo.url} size="sm" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-[var(--ink)]">{row.title}</p>
                {row.where && <p className="text-sm text-[var(--muted)]">{row.where}</p>}
                {row.bullets.length > 0 && (
                  <ul className="mt-1 list-disc whitespace-pre-line break-words pl-5 text-sm text-[var(--muted)]">
                    {row.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PublicProjectList({ projects }: { projects: PublicPortfolioProject[] }) {
  if (projects.length === 0) return null;
  const n = projects.length;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel as="h2">Shipped</SectionLabel>
        <span className="text-small tabular-nums text-[var(--faint)]">
          {n} {n === 1 ? "project" : "projects"}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {projects.map((project) => (
          <li key={project.id} className="min-w-0">
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
    <div>
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
