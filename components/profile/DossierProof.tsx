import type { CSSProperties } from "react";
import CompanyLogo from "@/components/ui/CompanyLogo";
import { formatDateRange, descriptionBullets } from "@/lib/experience-format";
import { schoolLogoUrl } from "@/lib/school-logo";
import { groupExperiences } from "@/lib/profile-dossier";

export type DossierExperience = {
  id: string;
  kind: string;
  org: string;
  role: string;
  term: string | null;
  note: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

export type DossierEducation = {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  start_date: string | null;
  end_date: string | null;
  school_domain: string | null;
  is_current: boolean;
};

function logoFor(logoByOrg: Map<string, string | null>, name: string): string | null {
  return logoByOrg.get(name.trim().toLowerCase()) ?? null;
}

export default function DossierProof({
  education,
  experiences,
  logoByOrg,
}: {
  education: DossierEducation[];
  experiences: DossierExperience[];
  logoByOrg: Map<string, string | null>;
}) {
  const groups = groupExperiences(experiences);

  return (
    <>
      {education.length > 0 && (
        <section className="card cascade-up mt-4 p-5 shadow-paper sm:p-6" style={{ "--delay": "80ms" } as CSSProperties}>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Education</h2>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {education.map((edu) => {
              const dateRange = formatDateRange(edu.start_date, edu.end_date, null);
              const degreeLine = [edu.degree, edu.field].filter(Boolean).join(", ");
              return (
                <li key={edu.id} className="flex gap-3 py-3 first:pt-1 last:pb-0">
                  <CompanyLogo name={edu.school} logoUrl={schoolLogoUrl(edu.school_domain)} size="md" />
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
      )}

      {groups.map((group, groupIndex) => (
        <section
          key={group.kind}
          className="card cascade-up mt-4 p-5 shadow-paper sm:p-6"
          style={{ "--delay": `${120 + groupIndex * 40}ms` } as CSSProperties}
        >
          <h2 className="text-sm font-semibold text-[var(--ink)]">{group.label}</h2>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {group.items.map((exp) => {
              const dateRange = formatDateRange(exp.start_date, exp.end_date, exp.term);
              const bullets = descriptionBullets(exp.note);
              return (
                <li key={exp.id} className="flex gap-3 py-3 first:pt-1 last:pb-0">
                  <CompanyLogo name={exp.org} logoUrl={logoFor(logoByOrg, exp.org)} size="md" />
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--ink)]">{exp.role}</p>
                    <p className="text-sm text-[var(--ink-muted)]">{exp.org}</p>
                    {dateRange && <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{dateRange}</p>}
                    {bullets.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-sm break-words text-[var(--ink-muted)]">
                        {bullets.map((bullet, j) => (
                          <li key={`${exp.id}-${j}`}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
