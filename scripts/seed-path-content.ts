/**
 * Prints SQL upserts for path content seeds (projects, skill tracks, interview banks).
 * Run: npx tsx scripts/seed-path-content.ts
 *
 * Tables assumed from ZERO_TO_INTERNSHIP_RESTRUCTURE §5A / §7 — apply migrations separately.
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

console.log("-- path_projects");
for (const p of PATH_PROJECTS) {
  console.log(
    `insert into path_projects (slug, title, difficulty, time_hours, languages, stack, domain, what_you_build, what_it_teaches, how_it_works, build_checklist, take_it_further, interview_roi, fits_stages, target_role_tags)
values (
  ${text(p.slug)},
  ${text(p.title)},
  ${text(p.difficulty)},
  ${sqlLiteral(p.time_hours)},
  ${sqlLiteral(p.languages)},
  ${sqlLiteral(p.stack)},
  ${text(p.domain)},
  ${sqlLiteral(p.what_you_build)},
  ${sqlLiteral(p.what_it_teaches)},
  ${sqlLiteral(p.how_it_works)},
  ${sqlLiteral(p.build_checklist)},
  ${p.take_it_further ? sqlLiteral(p.take_it_further) : "null"},
  ${text(p.interview_roi)},
  ${sqlLiteral(p.fits_stages)},
  ${sqlLiteral(p.target_role_tags)}
)
on conflict (slug) do update set
  title = excluded.title,
  difficulty = excluded.difficulty,
  time_hours = excluded.time_hours,
  languages = excluded.languages,
  stack = excluded.stack,
  domain = excluded.domain,
  what_you_build = excluded.what_you_build,
  what_it_teaches = excluded.what_it_teaches,
  how_it_works = excluded.how_it_works,
  build_checklist = excluded.build_checklist,
  take_it_further = excluded.take_it_further,
  interview_roi = excluded.interview_roi,
  fits_stages = excluded.fits_stages,
  target_role_tags = excluded.target_role_tags;
`,
  );
}

console.log("\n-- skill_tracks");
for (const t of SKILL_TRACKS) {
  console.log(
    `insert into skill_tracks (id, title, stages)
values (${text(t.id)}, ${text(t.title)}, ${sqlLiteral(t.stages)})
on conflict (id) do update set title = excluded.title, stages = excluded.stages;
`,
  );
}

console.log("\n-- company_interview_banks");
for (const b of COMPANY_INTERVIEW_BANKS) {
  console.log(
    `insert into company_interview_banks (company_slug, company_name, process_summary, questions)
values (
  ${text(b.company_slug)},
  ${text(b.company_name)},
  ${text(b.process_summary)},
  ${sqlLiteral(b.questions)}
)
on conflict (company_slug) do update set
  company_name = excluded.company_name,
  process_summary = excluded.process_summary,
  questions = excluded.questions;
`,
  );
}
