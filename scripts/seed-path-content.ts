/**
 * Prints SQL upserts for path content seeds matching §5A / WS1 schema.
 * Run: npx tsx scripts/seed-path-content.ts > /tmp/seed-path.sql
 *
 * path_projects.body jsonb holds the rich spec fields.
 * company_interview_banks.company_slug must exist in job_companies.
 */
import {
  PATH_PROJECTS,
  SKILL_TRACKS,
  COMPANY_INTERVIEW_BANKS,
} from "../lib/path/seeds";

function sqlLiteral(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function text(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function textArray(values: string[]): string {
  if (values.length === 0) return "'{}'::text[]";
  return `array[${values.map(text).join(", ")}]::text[]`;
}

console.log("-- path_projects");
for (const p of PATH_PROJECTS) {
  const body = {
    what_you_build: p.what_you_build,
    what_it_teaches: p.what_it_teaches,
    how_it_works: p.how_it_works,
    build_checklist: p.build_checklist,
    take_it_further: p.take_it_further ?? null,
    interview_roi: p.interview_roi,
  };
  console.log(
    `insert into public.path_projects (
  slug, title, difficulty, time_hours, languages, stack, domain, body, fits_stages, target_role_tags, published
) values (
  ${text(p.slug)},
  ${text(p.title)},
  ${text(p.difficulty)},
  array[${p.time_hours[0]}, ${p.time_hours[1]}]::int[],
  ${textArray(p.languages)},
  ${textArray(p.stack)},
  ${text(p.domain)},
  ${sqlLiteral(body)},
  ${textArray(p.fits_stages)},
  ${textArray(p.target_role_tags)},
  true
)
on conflict (slug) do update set
  title = excluded.title,
  difficulty = excluded.difficulty,
  time_hours = excluded.time_hours,
  languages = excluded.languages,
  stack = excluded.stack,
  domain = excluded.domain,
  body = excluded.body,
  fits_stages = excluded.fits_stages,
  target_role_tags = excluded.target_role_tags,
  published = true,
  updated_at = now();
`,
  );
}

console.log("\n-- skill_tracks");
for (const t of SKILL_TRACKS) {
  console.log(
    `insert into public.skill_tracks (id, title, body, published)
values (${text(t.id)}, ${text(t.title)}, ${sqlLiteral({ stages: t.stages })}, true)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  published = true;
`,
  );
}

/** Only banks whose slug already exists in job_companies will succeed. */
console.log("\n-- company_interview_banks (requires matching job_companies.slug)");
for (const b of COMPANY_INTERVIEW_BANKS) {
  console.log(
    `insert into public.company_interview_banks (company_slug, process_summary, questions, published)
select jc.slug, ${text(b.process_summary)}, ${sqlLiteral(b.questions)}, true
from public.job_companies jc
where jc.slug = ${text(b.company_slug)}
on conflict (company_slug) do update set
  process_summary = excluded.process_summary,
  questions = excluded.questions,
  published = true,
  updated_at = now();
`,
  );
}
