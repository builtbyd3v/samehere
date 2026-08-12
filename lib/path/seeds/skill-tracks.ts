import type { SkillTrack } from "@/lib/path/types";

/** Diagnosis picks a track + stage; UI renders current + next — not a roadmap mall. */
export const SKILL_TRACKS: SkillTrack[] = [
  {
    id: "new_grad_swe",
    title: "New grad / SWE internship",
    stages: [
      {
        id: "foundations",
        title: "Foundations that ship",
        description: "Get comfortable enough with the stack to finish a small app without freezing on setup.",
        skills: [
          {
            id: "git-basics",
            name: "Git + PRs",
            priority: "essential",
            why_it_matters: "Interns live in pull requests on day one; messy history slows reviews and trust.",
          },
          {
            id: "ts-js-fluency",
            name: "TypeScript / JS fluency",
            priority: "essential",
            why_it_matters: "Most internship codebases are JS/TS-heavy; fluency beats memorizing frameworks.",
          },
          {
            id: "http-json",
            name: "HTTP + JSON",
            priority: "essential",
            why_it_matters: "Almost every feature is request → validate → persist → respond.",
          },
          {
            id: "sql-selects",
            name: "SQL SELECT / JOIN",
            priority: "recommended",
            why_it_matters: "You’ll debug real data; ORM magic doesn’t excuse not reading the query.",
          },
        ],
        build_project_slug: "internship-portfolio",
      },
      {
        id: "ship-first-project",
        title: "Ship one real project",
        description: "Finish a productized loop end-to-end so applications have something clickable.",
        skills: [
          {
            id: "crud-ownership",
            name: "CRUD with ownership",
            priority: "essential",
            why_it_matters: "Authz bugs are internship landmines; hiring teams probe “who can see this row?”",
          },
          {
            id: "forms-validation",
            name: "Forms + validation",
            priority: "essential",
            why_it_matters: "Product quality shows in how you handle bad input, not happy paths.",
          },
          {
            id: "deploy",
            name: "Deploy a public URL",
            priority: "essential",
            why_it_matters: "A localhost story dies in resume screens; a URL survives.",
          },
          {
            id: "readme",
            name: "Readable README",
            priority: "recommended",
            why_it_matters: "Reviewers skim; a crisp README is your interview opener on mute.",
          },
        ],
        build_project_slug: "habit-tracker",
      },
      {
        id: "http-apis",
        title: "APIs that feel intentional",
        description: "Design endpoints and status codes like someone else will call them.",
        skills: [
          {
            id: "rest-shape",
            name: "REST resource design",
            priority: "essential",
            why_it_matters: "Interview whiteboard APIs reward clear nouns/verbs over framework trivia.",
          },
          {
            id: "error-model",
            name: "Consistent error model",
            priority: "essential",
            why_it_matters: "Interns who return random 500s lose debugging time for the whole team.",
          },
          {
            id: "auth-sessions",
            name: "Sessions / tokens basics",
            priority: "recommended",
            why_it_matters: "You’ll touch auth early; knowing cookies vs bearer tokens prevents footguns.",
          },
          {
            id: "idempotency",
            name: "Idempotent writes",
            priority: "optional",
            why_it_matters: "Retries happen; double charges and duplicate rows are how outages start.",
          },
        ],
        build_project_slug: "url-shortener",
      },
      {
        id: "data-modeling",
        title: "Data modeling under constraints",
        description: "Model multi-entity domains and explain the tradeoffs out loud.",
        skills: [
          {
            id: "normalization",
            name: "Tables vs JSON blobs",
            priority: "essential",
            why_it_matters: "Knowing when to normalize keeps migrations and queries sane.",
          },
          {
            id: "derived-state",
            name: "Derived vs stored state",
            priority: "essential",
            why_it_matters: "Balances, streaks, and counts go wrong when you cache without a source of truth.",
          },
          {
            id: "indexes",
            name: "Basic indexes",
            priority: "recommended",
            why_it_matters: "Slow list endpoints are a common intern bug once data isn’t toy-sized.",
          },
          {
            id: "migrations",
            name: "Forward-only migrations",
            priority: "recommended",
            why_it_matters: "Teams ship schema changes continuously; fear of migrations blocks features.",
          },
        ],
        build_project_slug: "expense-splitter",
        apply_checkpoint: true,
      },
      {
        id: "apply-early",
        title: "Apply while building",
        description: "Start applications before the “perfect” stack — volume + proof beats waiting.",
        skills: [
          {
            id: "resume-bullets",
            name: "Outcome-shaped bullets",
            priority: "essential",
            why_it_matters: "Recruiters scan for impact; “built X that does Y” beats tech laundry lists.",
          },
          {
            id: "target-list",
            name: "Target company list",
            priority: "essential",
            why_it_matters: "Scattered apps waste energy; a focused list compounds interview prep.",
          },
          {
            id: "story-bank",
            name: "Behavioral story bank",
            priority: "recommended",
            why_it_matters: "Conflict, ownership, and failure stories get reused across every loop.",
          },
          {
            id: "referral-asks",
            name: "Warm intro asks",
            priority: "optional",
            why_it_matters: "A clear ask with your URL beats a vague “can you refer me?”",
          },
        ],
        build_project_slug: "job-listings-board",
        apply_checkpoint: true,
      },
      {
        id: "systems-lite",
        title: "Systems lite for interviews",
        description: "Enough distributed intuition to survive internship system-design screens.",
        skills: [
          {
            id: "caching",
            name: "Caching basics",
            priority: "essential",
            why_it_matters: "You’ll be asked where you’d put a cache and what goes stale.",
          },
          {
            id: "rate-limits",
            name: "Rate limiting",
            priority: "recommended",
            why_it_matters: "Abuse controls show up in both APIs and design interviews.",
          },
          {
            id: "queues",
            name: "Background jobs",
            priority: "recommended",
            why_it_matters: "Email, ingest, and fanout shouldn’t block the request path.",
          },
          {
            id: "observability",
            name: "Logs + metrics",
            priority: "optional",
            why_it_matters: "Interns who can find production truth get trusted with bigger tickets.",
          },
        ],
        build_project_slug: "rate-limit-playground",
      },
      {
        id: "polish-and-deploy",
        title: "Polish that reads as seniority",
        description: "Tighten UX, a11y, and narrative so your projects look hireable under scrutiny.",
        skills: [
          {
            id: "empty-states",
            name: "Empty / error / loading states",
            priority: "essential",
            why_it_matters: "Demo day is won in the edges; blank screens kill confidence.",
          },
          {
            id: "a11y-basics",
            name: "Keyboard + labels",
            priority: "recommended",
            why_it_matters: "Accessibility is both ethics and a quality signal in reviews.",
          },
          {
            id: "case-studies",
            name: "Case study writeups",
            priority: "essential",
            why_it_matters: "Interviews ask “walk me through a project” — write it before they do.",
          },
          {
            id: "perf-pass",
            name: "Basic perf pass",
            priority: "optional",
            why_it_matters: "N+1 queries and huge bundles are easy fixes that look sharp.",
          },
        ],
        build_project_slug: "spaced-flashcards",
      },
    ],
  },
];

export function getSkillTrack(id: string): SkillTrack | undefined {
  return SKILL_TRACKS.find((t) => t.id === id);
}
