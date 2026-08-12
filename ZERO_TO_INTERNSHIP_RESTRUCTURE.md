# samehere → Zero-to-Internship Restructure

**Status:** Agreed product plan + content-substrate addendum (planning; not yet implemented)  
**Branch for this doc:** `cursor/projects-interview-roadmaps-plan-b75f`  
**Audience:** Humans + AI agents executing parallel workstreams  
**Stack (unchanged):** Next.js App Router, React 19, TypeScript, Tailwind 4, Supabase (Auth/Postgres/RLS/Realtime), Claude via OpenAI-compatible SDK, Stripe, Resend, Vercel  
**Competitive note:** ResuMax inspirations captured Aug 2026 — steal flow patterns, not their static catalog product. See §5A.

---

## 0. One-sentence product

**samehere becomes an AI internship coach that redesigns itself around each student** — solo-first, struggle-aware, with a thin opt-in layer so people who logged real company experience can be asked for help.

---

## 1. Why this pivot

### Current product (problem)
samehere is a full student social network: feed, SameHere reactions, follows, DMs, clubs, heatmap, leaderboard, referrals, plus a jobs board. That requires network density to feel alive. Cold-start users get an empty social product. Jobs/AI are bolted on, not the spine.

### Target product (solution)
An adaptive **zero → internship** path. One user gets full value on day one. AI diagnoses where they’re stuck and chooses a **UI recipe** so the app *looks and behaves differently* per user. Social shrinks to **opt-in company helpers** (experience + explicit consent), reached from listings via 1:1 DM.

### Strategic frame (YC-adjacent, honest)
| Theme | How we use it |
|---|---|
| **The Primer** | Per-user learner profile; product reshapes itself |
| **AI consumer product** | Daily habit during recruiting season |
| **AI-native service** | Sell progress toward the outcome, not a feed |
| **Thin multiplayer** | AI does the work; humans are opt-in assist |

### North-star metrics (not vanity DAU)
1. **Primary:** interview secured (self-reported or tracker status)  
2. **Secondary:** applications submitted (quality bar), projects shipped, helper DMs started  
3. **Aha (session 1):** intake → diagnosis → recipe home → first task started (~10 min)

Do **not** optimize for posts, reactions, or time-in-feed.

---

## 2. Product principles

1. **Solo-complete** — helpers multiply value; they never gate it.  
2. **Compositional UI, not generative HTML** — AI picks among fixed recipes.  
3. **Few recipes, strong opinions** — 5 max; each has a forbidden set + graduation rule.  
4. **Same here = trust, not feed** — empathy copy + proof; no social mechanic as core.  
5. **Never paywall hope** — diagnosis + first recipe home stay free.  
6. **Surgical pivot** — same repo/stack; gut surfaces; don’t greenfield rewrite.  
7. **Mission free, velocity paid** — Pro meters depth/speed at high-stakes moments.

---

## 3. Keep / cut / reshape

### Keep and reshape
| Area | Paths | Notes |
|---|---|---|
| Auth | `app/(auth)/`, `app/auth/` | Keep invite-only flag as ops lever |
| Profiles + education + experiences | `app/(app)/profile/`, `ExperienceEditor` | Becomes internship dossier |
| Jobs ingest + board + fit + pitch | `app/(app)/jobs/`, `api/cron/jobs-ingest` | Core opportunity surface |
| “Students with a path here” | `app/(app)/jobs/[id]/page.tsx` | Becomes **only** peer discovery; add `open_to_help` filter |
| 1:1 DMs | `app/(app)/messages/` | Help asks only; later hide/disable group DM creation in UI |
| Stripe Pro + AI quota | `lib/stripe.ts`, `use_ai_quota` | Retarget perks to path features |
| Trust/safety, admin, settings | reports, blocks, `/admin`, `/settings` | Keep |
| Design tokens / fonts | Figtree + Fraunces, `--blue` signature | Keep brand; don’t purple-ify |

### Cut from primary product (deprecate → redirect → delete)
| Surface | Routes / systems | Redirect target |
|---|---|---|
| Feed / posts / reactions / reposts / quotes / bookmarks-as-posts | `/feed`, `/post/[id]`, `/quote/[id]`, `/saved` (post bookmarks) | `/` home (path) |
| Clubs + Eve | `/community`, `/community/clubs/[slug]`, cron `/api/cron/eve` | `/` or remove from nav |
| Heatmap / streaks / leaderboard / contribution | community leaderboard tab, heatmap UI, `contribution_log` writes from product | stop writing; hide UI |
| Follow graph / suggested peers / NL people search | followers pages, search people AI, weekly-matches email | remove from nav; kill weekly-matches cron |
| Group DMs | group create UI | leave schema; hide create |
| Social onboarding steps | follow + post steps | replace with intake |

**Deprecation rule for agents:** Phase A = nav + redirects so users can’t reach dead UX. Phase B = stop crons/emails. Phase C = delete code (separate PR once path is stable). Do not delete schema in Phase A.

### New surfaces
| Surface | Route (proposed) | Purpose |
|---|---|---|
| Path home | `/` or `/home` (signed-in) | Recipe-based adaptive home |
| Intake / re-intake | `/onboarding`, `/path/redo` | Struggle-aware diagnostic |
| Applications | `/applications` | Tracker pipeline |
| Opportunities | `/jobs` (rename nav label) | Board + fit |
| Helpers (embedded) | on `/jobs/[id]` | Opt-in peers |
| Interview module | section on home or `/prep` | Company banks + thin Q practice when recipe needs it |
| Project plan module | section on home | Native project builds for `studio` / early path |
| Project workspace | `/projects/[slug]` (in-app) | First-party project specs + progress — **never link-out as the product** |
| Skill stages (substrate) | not a primary nav catalog | Ordered stages feed diagnosis / `project_plan`; surfaced inside recipes |
| Company interview banks | `/prep/[company]` or embedded in `prep_room` | Company-specific Qs with approach + evaluation |

**Nav (final):**
- Primer-style **top path nav** (no left rail): Path · Opportunities · Applications · Prep · Messages  
- Account / Upgrade sit in the right cluster (avatar menu + Pro)  
- Order/emphasis adapts from `path_plans.ui.nav_emphasis`  
- Drop: Community, Saved, Feed, Search-as-people (optional later: search listings only)  
- **Not primary nav:** Roadmaps catalog, Projects library browse — those are *substrates* reached from the path, not parallel products.

---

## 4. Per-user compositional UI (first-class)

### Model
AI does **not** invent layouts. After intake (and on re-diagnosis) it writes:

```ts
type UiRecipe =
  | "studio"        // no experience / feels behind
  | "ops_desk"      // ready to apply
  | "prep_room"     // interviewing
  | "focus_track"   // overwhelmed / constrained — one move only
  | "network_gap";  // strong profile, weak warm intros

type PathPlanUi = {
  ui_recipe: UiRecipe;
  module_order: ModuleId[];
  nav_emphasis: NavId[];      // order + which items to emphasize
  tone: "steady" | "urgent" | "encouraging";
  headline: string;           // short, grounded in intake
  why: string;                // one sentence, same-here voice
};
```

Server reads `path_plans.ui` and renders the matching layout component, e.g. `components/path/recipes/StudioHome.tsx`.

### Recipe specs

#### `studio`
- **Who:** no/weak projects, feels behind, early stage  
- **Hero:** “Build this week’s project”  
- **Show:** project plan tasks, dossier gaps  
- **Hide / demote:** spray-apply CTA, helper rail (unless one warm target)  
- **Graduate when:** ≥1 solid project/experience logged OR diagnosis says appointable  

#### `ops_desk`
- **Who:** ready to apply  
- **Hero:** application pipeline + next listing to act on  
- **Show:** ranked matches, tracker, pitch CTA, helpers on target orgs  
- **Hide:** long project curricula  
- **Graduate when:** first interview scheduled → `prep_room`  

#### `prep_room`
- **Who:** interviewing  
- **Hero:** next interview + practice set  
- **Show:** company-specific prep, helper for *that* org, light tracker  
- **Hide:** “find more jobs” as primary  
- **Graduate when:** offer / back to applying → `ops_desk` or done state  

#### `focus_track`
- **Who:** overwhelmed, heavy constraints, burnout risk  
- **Hero:** **exactly one** next action  
- **Show:** minimal chrome; mute secondary modules  
- **Graduate when:** user marks unstuck or completes 3 focus tasks  

#### `network_gap`
- **Who:** decent profile, weak network  
- **Hero:** helpers + warm intro drafts for target companies  
- **Show:** target org list, open_to_help peers, icebreakers  
- **Demote:** mass apply until N intros attempted  
- **Graduate when:** helper conversations started OR apply volume justified  

### Tone rules (same-here voice)
- Name the struggle without pity (“Transferring mid-cycle is common.”)  
- No emoji spam, no coach-bro hype, no em dashes in AI copy (match existing `ai-prompts` style)  
- Ground every headline in intake facts  

### Success test for personalization
A stranger glancing at three users’ homes should infer three different stages without reading bios. If every home still looks like a dashboard, personalization failed.

---

## 5. Core loop detail

```
Signup → Intake → AI diagnosis → path_plan + ui_recipe
    → Adaptive Home (recipe)
        → Modules (ordered)
            → Opportunities / Applications / Prep / Project / Helpers
    → Events (task done, app submitted, interview, stuck, weekly)
    → Re-diagnosis → possibly new recipe
```

### Intake fields (v1)
Store raw answers in `intake_responses`; derived profile in `learner_profiles`.

| Field | Type | Why |
|---|---|---|
| `stage` | enum: `no_experience` \| `building` \| `applying` \| `interviewing` \| `offers` | Recipe seed |
| `constraints` | multi: `first_gen`, `transfer`, `commuter`, `international`, `limited_network`, `working_job`, `career_switch` | Same-here segments (see `lib/landing/demo-data.ts`) |
| `target_roles` | text[] | Match + pitch |
| `target_companies` | text[] | Helpers + focus |
| `timeline` | enum: `this_cycle` \| `next_cycle` \| `exploring` | Urgency / tone |
| `major` / `year` / school | reuse profile + education | Existing |
| `blocker` | short free text | Diagnosis color |
| `resume_or_projects` | optional paste / list | Studio vs ops |

Replace current 6-step social onboarding (`OnboardingWizard` steps: basics → follow → post → education → experience → AI matches). New flow: basics/education/experience (keep useful parts) → **struggle intake** → diagnosis splash → recipe home. No follow/post steps.

### Modules (v1 library)

| `ModuleId` | Job | Exists? |
|---|---|---|
| `dossier` | Profile/education/experience completeness | Yes — reshape |
| `opportunities` | Ranked internships + reasons | Yes — job fit |
| `applications` | Wishlist → applied → OA → interview → offer/rejected | **New** |
| `pitch` | Resume bullets for one listing | Yes — Pro pitch |
| `project_plan` | Assign + track **native** project builds when experience is the gap | **New** (see §5A) |
| `interview_prep` | Company bank Qs + written answers + AI feedback | **New** (see §5A; not video sim) |
| `helpers` | Opt-in peers at org | Partial on job detail |
| `skill_stages` | Current stage + why-it-matters + next checkpoint (substrate UI) | **New** (embedded, not a catalog) |

---

## 5A. Content substrates — steal ResuMax *flow*, keep our product

ResuMax is useful as a **pattern reference**, not a twin. Observed (Aug 2026):

| Surface | What they do | Gap we exploit |
|---|---|---|
| **Projects** | Native *specs* (WHAT / TEACHES / HOW) on-site; guides + many roadmap “BUILD IT” links still send users **out** (dev.to, etc.) | We keep the **whole build loop in-app** — spec, checklist, progress, dossier write-back |
| **Roadmaps** | 12 static role catalogs; stages + “WHY IT MATTERS” + external resource piles; checkpoint “start applying early” | We use stages as a **substrate the diagnosis picks from**, not a browsable roadmap mall |
| **Interview Qs** | 31 company banks; process blurb; coding/system/behavioral; approach + “what they’re evaluating”; practice box | We ship company banks as a first-class `prep_room` weapon, tied to *their* target orgs + applications |

### Non-negotiable product constraint

Do **not** turn samehere into:

- A static roadmap catalog product (“pick Frontend”)  
- A link aggregator to CS50 / freeCodeCamp / LeetCode as the core loop  
- A resume-first ResuMax clone  

Keep the spine: **struggle-aware intake → UI recipe → modules → events → re-diagnosis**, plus YC-thin helpers on listings. Content substrates **feed** recipes; they do not replace them.

### A. Native projects (first-party, in-app)

**Job:** Close the experience gap inside `studio` / early `focus_track` without bouncing users to another site.

**Project record (curated seed + AI can propose variants later):**

```ts
type PathProject = {
  slug: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  time_hours: [number, number]; // e.g. [8, 12]
  languages: string[];
  stack: string[];
  domain: string; // "Backend & APIs", "AI & Agents", …
  what_you_build: string[];
  what_it_teaches: string[];
  how_it_works: { step: number; title: string; detail: string }[];
  build_checklist: { id: string; title: string; optional?: boolean }[]; // IN-APP steps
  take_it_further?: string[];
  interview_roi: string; // one sentence: why hireable
  fits_stages: string[]; // skill stage ids, not marketing roadmaps
  target_role_tags: string[]; // internship roles this supports
};
```

**In-app loop (required):**
1. Path assigns a project → `path_tasks` + `user_projects` row  
2. User works checklist **inside** `/projects/[slug]` (no “open external tutorial” as primary CTA)  
3. Optional *docs* links allowed as secondary “reference” only — never the hero action  
4. On complete → dossier experience draft + pitch bullets + readiness signal for re-diagnosis  
5. `studio` hero = **this week’s project**, not a grid of 40 cards  

**v1 content:** seed ~8–12 opinionated beginner/intermediate projects aligned to common internship tracks (web, backend, data-lite, AI-lite). Quality over catalog size. Prefer stacks students can ship in a week.

**Anti-pattern:** ResuMax-style “BUILD IT” that deep-links to another site’s tutorial as the product.

### B. Skill stages (roadmap *flow* without roadmap *product*)

Steal from ResuMax roadmaps:

1. **Ordered stages** with ESSENTIAL / RECOMMENDED / OPTIONAL skills  
2. **“Why it matters”** hiring-market framing per skill  
3. **BUILD checkpoint** → assigns a *native* project (A), not an outbound tutorial  
4. **Apply-early checkpoint** → can flip recipe toward `ops_desk` before “100% complete”  
5. Progress that is **legible** (stage N of M) without becoming a second home

**Do not ship:** `/roadmaps` as a role picker mall in v1.

**Do ship:** a small set of **track templates** (e.g. `new_grad_swe`, `frontend_intern`, `data_intern`) stored as data. Diagnosis picks a track + stage index; `skill_stages` module renders only **current + next**. User request (“I want Stripe backend in 6 weeks”) can remap stage order / project picks via AI — that’s the adaptive product.

```ts
type SkillTrack = {
  id: string; // new_grad_swe | frontend_intern | …
  title: string;
  stages: {
    id: string;
    title: string;
    description: string;
    skills: {
      id: string;
      name: string;
      priority: "essential" | "recommended" | "optional";
      why_it_matters: string;
      // optional secondary references — never the primary CTA
      refs?: { title: string; url: string }[];
    }[];
    build_project_slug?: string; // → PathProject
    apply_checkpoint?: boolean; // after this stage, nudge ops_desk
  }[];
};
```

**Recipe mapping:**
- `studio` — show current stage + assigned project  
- `focus_track` — one skill or one checklist item from current stage  
- `ops_desk` — stage progress demoted; apply checkpoint already fired  
- `prep_room` — stage frozen; interview banks take hero  
- `network_gap` — stage demoted; helpers hero  

### C. Company interview question banks (`prep_room`)

Steal from ResuMax interview banks:

- Per-company **process** summary (rounds, OA style)  
- Typed questions: `coding` | `system_design` | `behavioral` | `role_fit`  
- For each Q: prompt, difficulty, **how to approach**, **what they’re evaluating**  
- In-app answer box + AI feedback (metered Pro)  
- Tie Qs to **user’s shipped projects / dossier** when possible (“explain YOUR URL shortener’s rate limit”)

**Sources policy (v1):**
- Curate a starter bank for high-frequency internship recruiters (start ~10–15 companies overlapping `job_companies` + user `target_companies`)  
- Attribution allowed when community-sourced; we own the coaching wrapper  
- External LeetCode links may appear as “practice this pattern” secondary refs — the **session stays on samehere**

**Activation:**
- Application moves to `interview` / `oa` → recipe → `prep_room`  
- Bank for that org (or closest peer) loads as hero practice set  
- If no bank yet: generate thin Q set via `INTERVIEW_PREP_SYSTEM` from JD + dossier (existing plan) and queue company for editorial seed  

### D. How substrates connect (must be tight — ResuMax is siloed)

```
Intake / request (“Adobe SWE intern”)
  → diagnosis picks skill_track + stage + ui_recipe
  → studio: native project from stage.build_project_slug
  → complete project → dossier + readiness
  → apply checkpoint / ops_desk → applications
  → interview status → prep_room company bank
  → helpers on that org (unchanged thin multiplayer)
  → events → re-diagnosis (may jump stages or recipes)
```

**YC-request matching stays intact:** helpers + DMs remain the only peer layer; projects/roadmaps/interview banks are **solo substrates**, not a social feed.

### E. Monetization touch (extends §10)

| Free | Pro velocity |
|---|---|
| Diagnosis + current stage + 1 active native project | More concurrent projects / plan regen |
| Browse company bank previews (few Qs) | Full bank + AI feedback packs |
| Apply-early checkpoint | Unlimited re-diagnosis after interviews |

Still: never paywall hope / first diagnosis / knowing a path exists.

---

## 6. Opt-in company helpers

### Consent rule
A user appears as a helper for org X iff:
1. They have an `experiences` row with `kind` in (`internship`, `job`, `research`) whose org matches X (normalized), **and**
2. `profiles.open_to_help = true` (explicit; default **false** until confirmed on experience save or settings)

### UX
- On `/jobs/[id]`: “N people open to help who’ve been here”  
- Request help → AI icebreaker (reuse `ICEBREAKER_SYSTEM` patterns) → create/open **1:1 DM**  
- Helper can pause via settings / `open_to_help`  
- No public feed of asks; optional later: `help_requests` table for analytics

### Org matching (must harden)
Today: `ilike` on `experiences.org` vs listing org (fragile).  
v1: normalize via `job_companies.slug` when possible; store `company_slug` on experiences when user picks from known companies; fallback normalized string match.

---

## 7. Data model

### Additive migrations (new)

```text
profiles.open_to_help boolean not null default false

experiences.company_slug text null references job_companies(slug)

intake_responses (
  id uuid pk,
  user_id uuid not null references profiles on delete cascade,
  version int not null,
  answers jsonb not null,
  created_at timestamptz not null,
  unique (user_id, version)
)

learner_profiles (
  user_id uuid pk references profiles,
  version int not null,
  diagnosis jsonb not null,  -- strengths, gaps, blockers, confidence, segment tags
  updated_at timestamptz
)

path_plans (
  user_id uuid pk references profiles,
  ui jsonb not null,         -- PathPlanUi
  rationale text,
  source_intake_id uuid references intake_responses(id) on delete set null,
  updated_at timestamptz
)

path_tasks (
  id uuid pk,
  user_id uuid references profiles,
  module_id text not null,
  title text not null,
  detail text,
  status text check in ('todo','doing','done','skipped'),
  sort_index int,
  due_on date null,
  created_at, updated_at
)

applications (
  id uuid pk,
  user_id uuid references profiles,
  listing_id uuid null references job_listings,
  org text not null,
  role text not null,
  status text check in ('wishlist','applied','oa','interview','offer','rejected','withdrawn'),
  notes text,
  updated_at, created_at
)

-- Content substrates (§5A). Seed/curated rows are readable by authenticated users;
-- progress tables are owner-CRUD only.

path_projects (
  slug text pk,
  title text not null,
  difficulty text not null,
  time_hours int[2] not null,
  languages text[] not null,
  stack text[] not null,
  domain text not null,
  body jsonb not null,       -- what_you_build, what_it_teaches, how_it_works, checklist, interview_roi, …
  fits_stages text[] not null default '{}',
  target_role_tags text[] not null default '{}',
  published boolean not null default true,
  updated_at timestamptz not null
)

user_projects (
  id uuid pk,
  user_id uuid not null references profiles on delete cascade,
  project_slug text not null references path_projects(slug),
  status text check in ('assigned','doing','done','skipped'),
  checklist_state jsonb not null default '{}',
  linked_path_task_id uuid null references path_tasks(id) on delete set null,
  completed_at timestamptz null,
  created_at, updated_at,
  unique (user_id, project_slug)
)

skill_tracks (
  id text pk,                -- new_grad_swe, frontend_intern, …
  title text not null,
  body jsonb not null,       -- stages[], skills, build_project_slug, apply_checkpoint
  published boolean not null default true
)

learner_profiles additions:
  skill_track_id text null references skill_tracks(id)
  skill_stage_id text null   -- current stage within track
  -- keep inside diagnosis jsonb if preferred in v1; columns optional

company_interview_banks (
  company_slug text pk references job_companies(slug),
  process_summary text not null,
  questions jsonb not null,  -- [{id,type,difficulty,prompt,approach,evaluating,source?}]
  published boolean not null default true,
  updated_at timestamptz not null
)

interview_practice (
  id uuid pk,
  user_id uuid not null references profiles on delete cascade,
  company_slug text not null references company_interview_banks(company_slug),
  question_id text not null,
  answer text,
  ai_feedback text,
  created_at timestamptz not null
)
```

`intake_responses` is append-only per submission: re-intake inserts the next
`version` instead of overwriting raw answers. `learner_profiles.version` records
which diagnosis version is current, while `path_plans.source_intake_id` points
to the exact intake that produced the active plan.

RLS: user can CRUD own progress rows only (`user_projects`, `interview_practice`, path tables). Authenticated read on published `path_projects`, `skill_tracks`, `company_interview_banks`. No anon access to learner data; published content may be auth-gated in v1 (same as product).

### Soft-deprecated (stop product writes; don’t drop yet)
`posts`, `reactions`, `comments`, `reposts`, `bookmarks` (post), `clubs*`, `contribution_log` (new writes), follow-driven notifications where unused.

### Types
Regenerate or hand-update `types/database.types.ts` after migrations.

---

## 8. AI layer

### New prompts in `lib/ai-prompts.ts`
| Export | Purpose | Output |
|---|---|---|
| `INTAKE_DIAGNOSIS_SYSTEM` | From intake JSON → learner profile + recipe + **skill_track/stage** + module_order + tone + headline/why + initial tasks + **assigned project_slug** | Strict JSON |
| `REDIAGNOSIS_SYSTEM` | From prior profile + events → updated plan (may advance stage / switch recipe) | Strict JSON |
| `PROJECT_PLAN_SYSTEM` | Pick/adapt native `path_projects` into weekly checklist tasks (prefer catalog; invent only if gap) | Strict JSON |
| `INTERVIEW_PREP_SYSTEM` | Prefer company bank Qs; else generate thin Q set + rubric from JD/dossier; always offer written feedback schema | Strict JSON |
| `INTERVIEW_FEEDBACK_SYSTEM` | Grade one written answer vs approach/evaluating + user’s projects | Strict JSON |
| `PATH_TASK_NUDGE_SYSTEM` | One next-action nudge | One sentence |

### Keep
`JOB_FIT_SYSTEM`, `JOB_PITCH_SYSTEM`, `ICEBREAKER_SYSTEM`, `PROFILE_DRAFT_SYSTEM` (dossier assist)

### Retire from product (code can linger until Phase C)
`CONNECTION_SYSTEM`, `COMPOSER_SYSTEM`, `PEOPLE_SEARCH_SYSTEM`, `IMPROVE_SYSTEM`, `EVE_*`

### Guardrails
- Always `untrusted()` wrap user text  
- Render AI as plain text only  
- Server-side only; quota via `use_ai_quota` with new kinds: `intake_diagnosis`, `rediagnosis`, `project_plan`, `interview_prep`, `interview_feedback`, `path_task_nudge`
- Free: 1 diagnosis + limited weekly nudges + 1 active project; Pro: unlimited re-diagnosis, pitch, interview packs/feedback  

The foundation migration must extend `ai_usage.kind` before any new kind is
called and replace `use_ai_quota(text)` with explicit caps. Suggested v1 caps:
`intake_diagnosis` 1/day free and 150/day Pro; `rediagnosis` 0/day free and
150/day Pro; `project_plan` 1/day free and 150/day Pro; `interview_prep` 0/day
free and 150/day Pro; `interview_feedback` 2/day free and 150/day Pro;
`path_task_nudge` 1/day free and 150/day Pro. “Unlimited”
in product copy means the existing 150/day abuse ceiling for Pro.

### Recipe selection constraint
Model must choose `ui_recipe` from the enum only. Validate server-side; fallback heuristic if invalid:

```
if stage == interviewing → prep_room
else if constraints includes overwhelmed-ish / focus → focus_track
else if stage in (no_experience, building) → studio
else if limited_network && profile strong → network_gap
else → ops_desk
```

---

## 9. Information architecture & routing

### Proposed signed-in IA
| Route | Owner UI |
|---|---|
| `/home` (or make `/` auth home) | Recipe home |
| `/onboarding` | New intake wizard |
| `/jobs`, `/jobs/[id]` | Opportunities (+ helpers) |
| `/applications` | Tracker |
| `/messages`, `/messages/[id]`, `/messages/with/[username]` | DMs |
| `/profile/[username]`, `/profile/edit` | Dossier (public profile simplified: identity + experience + help status; no posts grid) |
| `/pro`, `/settings`, `/admin` | Keep |
| `/feed`, `/community`, `/saved`, `/leaderboard`, `/search` (people), `/post/*` | Redirect → `/home` |

### Files to change first (nav)
- `components/layout/LeftNav.tsx`  
- `components/layout/MobileNav.tsx`  
- `app/(app)/dashboard/page.tsx` (redirect to `/home`)  
- `app/(app)/layout.tsx` (shell spacer / feed-specific CSS removal later)

### Landing rewrite (`components/landing/`)
Replace social story with:
1. Hero — brand + path-first headline + one CTA (demo: recipe morph)  
2. Adaptive path demo (three recipes)  
3. Company helpers proof (evolve `JobsProof.tsx`)  
4. Pricing (path features, not cosmetics-first)  
5. FAQ + FinaleCta (“You’re not the only one. same here.”)

Remove or retire: ProofWall-as-feed, HeatmapProof, Founders/Social Butterfly as primary proof (optional later).

Update meta in `app/page.tsx`, `app/layout.tsx`, OG copy.

---

## 10. Monetization fence (v1)

### Free
- Intake + diagnosis  
- Recipe home + core path tasks  
- Browse jobs + basic tracker  
- Limited AI (e.g. 1 diagnosis/day, 3 fits/day — tune to cost)  

### Pro (velocity) — **$12/mo · $29/semester**
- Unlimited re-diagnosis / recipe switches  
- Unlimited pitches per listing  
- Interview prep packs + AI feedback  
- Stronger model tier / higher daily caps  

### Ultra (interview season) — **$29/mo · $79/semester** (~2.4× Pro)
- Everything in Pro  
- Unlimited interview packs and feedback  
- Priority helper icebreakers on target orgs  
- Concurrent projects + plan regen without waiting  
- Highest model tier and weekly path sprint nudges  

### Explicitly do NOT paywall
- Initial “you’re not alone” diagnosis  
- Seeing that a path exists for their segment  

### Later (out of v1 build)
- University / bootcamp B2B seats  
- Recruiter-side marketplace (delay until trust is strong)

### Upsell by recipe
| Recipe | Natural upsell |
|---|---|
| `studio` | Deeper project coaching / plan regen |
| `ops_desk` | Pitch volume |
| `prep_room` | Interview packs (highest urgency) |
| `network_gap` | Intro assists |
| `focus_track` | Accountability nudges (email) |

---

## 11. Emails & crons

| Cron | Action |
|---|---|
| `jobs-ingest` | **Keep** |
| `unread-digest` | **Keep** (DMs still matter) |
| `weekly-matches` | **Disable** (peer networking email) |
| `eve` | **Disable** |

New (optional v1.1): weekly path nudge email (“your one move”) using path tasks.

Update `vercel.json` when disabling.

---

## 12. Implementation workstreams (for delegation)

Execute as **separate PRs / agent tasks**. Dependencies noted. Each stream lists acceptance criteria.

---

### WS0 — Plan lock & scaffolding
**Owner:** coordinator  
**Deliverable:** this doc merged; feature branch prefix `cursor/…-0889`  
**Acceptance:** team agrees cut list + recipe enum frozen for v1  

---

### WS1 — Schema + RLS + types
**Depends on:** WS0  
**Touch:** `supabase/migrations/YYYYMMDDHHMMSS_path_foundation.sql`, `types/database.types.ts`  
**Do:**
- Add columns/tables from §7 including §5A substrates (`path_projects`, `user_projects`, `skill_tracks`, `company_interview_banks`, `interview_practice`)  
- RLS policies (own progress rows; authenticated read on published content)  
- Indexes: `applications(user_id, status)`, `path_tasks(user_id, status)`, `user_projects(user_id, status)`, experiences org/slug lookup  
- Extend the `ai_usage.kind` check and `use_ai_quota(text)` for every new path quota kind in §8
**Acceptance:**
- Migration applies cleanly  
- Authenticated user can CRUD own `intake_responses`, `learner_profiles`, `path_plans`, `path_tasks`, `applications`, `user_projects`, and `interview_practice`
- A second authenticated user cannot read or mutate any of those rows; anon cannot read them
- Published substrate tables are readable by authenticated users when `published = true`
- New quota kinds are accepted and enforce their free/Pro caps without a constraint error
- Types compile  

---

### WS2 — Intake + diagnosis AI
**Depends on:** WS1  
**Touch:** `app/(app)/onboarding/*`, `components/onboarding/*`, `lib/ai-prompts.ts`, new `lib/path/diagnose.ts`  
**Do:**
- Replace social wizard with intake UI  
- Server action: save intake → call diagnosis → write `learner_profiles` + `path_plans` + seed `path_tasks`  
- Validate recipe enum; apply heuristic fallback  
- Quota kind `intake_diagnosis`  
**Acceptance:**
- New user completes intake without follow/post steps  
- DB rows written; invalid recipe never persisted  
- Free user hitting cap sees clear upsell, not a crash  
- Unit tests for JSON parse + fallback heuristic  

---

### WS3 — Recipe layout system + path home
**Depends on:** WS1; ideally WS2  
**Touch:** new `app/(app)/home/page.tsx`, `components/path/**`, nav files  
**Do:**
- Implement 5 recipe layout components sharing module primitives  
- Home reads `path_plans.ui` and renders recipe  
- Tone → CSS data attribute or class map (subtle, not a new theme system)  
- Empty state: if no plan, redirect to `/onboarding`  
**Acceptance:**
- Fixtures for each recipe render distinct hierarchy (hero differs)  
- Mobile + desktop usable  
- No feed chrome on home  
- Meets design rules: one composition, brand present, no card spam in hero  

---

### WS4 — Dynamic nav
**Depends on:** WS3  
**Touch:** `LeftNav.tsx`, `MobileNav.tsx`, optionally small context from viewer plan  
**Do:**
- Final IA labels/hrefs  
- Order from `nav_emphasis` when present  
- Hide Community / Saved / Feed  
**Acceptance:**
- No nav link reaches deprecated surfaces without redirect  
- Active states correct for `/home`, `/jobs`, `/applications`  

---

### WS5 — Applications tracker
**Depends on:** WS1  
**Touch:** `app/(app)/applications/*`, components  
**Do:**
- CRUD applications; status pipeline UI  
- “Add from listing” on job detail  
- Home `ops_desk` / `prep_room` consume tracker summary  
**Acceptance:**
- User can move a listing through statuses  
- Listing-linked and manual org/role rows both work  

---

### WS6 — Wire jobs fit/pitch into path
**Depends on:** WS3, existing jobs  
**Touch:** `app/(app)/jobs/*`, path modules  
**Do:**
- Opportunities module embeds fit results  
- Pitch CTA from path task / listing  
- Rename nav “Jobs” → “Opportunities” (copy only)  
**Acceptance:**
- From home, user reaches ranked listings without using old feed mental model  

---

### WS7 — Helpers opt-in + harden matching
**Depends on:** WS1  
**Touch:** `profiles.open_to_help`, experience editor, `jobs/[id]/page.tsx`, DM icebreaker  
**Do:**
- Toggle on experience save + settings  
- Filter peers by `open_to_help`  
- Org normalization pass (slug when possible)  
- Help request → DM with drafted icebreaker  
**Acceptance:**
- Users with `open_to_help=false` never appear  
- Opt-in user appears on matching listing  
- Seeker can open DM in one flow  

---

### WS8 — Native projects + skill-stage substrate + interview banks
**Depends on:** WS2, WS3; WS1 extended with §5A tables  
**Touch:** seeds, prompts, `components/path/**`, `/projects/[slug]`, `/prep` or prep module, actions  
**Do:**
- Seed `path_projects` (8–12) with full in-app checklists (no outbound hero CTA)  
- Seed 1–2 `skill_tracks` (at least `new_grad_swe`) with stages → `build_project_slug` + apply checkpoints  
- Seed starter `company_interview_banks` (≥10 companies overlapping common internship orgs)  
- Diagnosis writes `skill_track_id` / stage + assigns `user_projects`  
- `studio` / `skill_stages` modules render current stage + project hero  
- Project workspace: checklist progress → `user_projects.checklist_state`; complete → dossier draft hook  
- `prep_room`: load bank for application org (fallback AI thin set); answer + `interview_feedback`  
**Acceptance:**
- Completing a project never requires leaving samehere as the primary path  
- Roadmap *flow* visible as stage progress inside recipe home — **no** `/roadmaps` mall in v1  
- `prep_room` shows company-specific Qs with approach + evaluating for at least one seeded company  
- Assigning Stripe/Adobe-like targets from intake still yields recipe + helpers path (YC matching unchanged)  

---

### WS9 — Re-diagnosis triggers
**Depends on:** WS2, WS5  
**Touch:** `lib/path/rediagnose.ts`, actions, optional cron  
**Do:**
- Manual “I’m stuck / something changed”  
- Auto triggers: first application, first interview status, weekly  
- Preserve task history; rewrite plan + recipe  
**Acceptance:**
- Moving application → `interview` can flip recipe to `prep_room`  
- User can force re-intake  

---

### WS10 — Deprecate social surfaces
**Depends on:** WS3, WS4  
**Touch:** redirects in old pages; `vercel.json`; emails  
**Do:**
- `/feed`, `/community`, `/saved`, `/post/*`, etc. → `/home`  
- Disable `weekly-matches` + `eve` crons  
- Stop linking heatmap/leaderboard  
**Acceptance:**
- Primary UX cannot reach feed/clubs  
- Crons disabled in `vercel.json`  
- No broken nav hrefs  

---

### WS11 — Landing + README + Pro copy
**Depends on:** WS3 (for accurate demos)  
**Touch:** `components/landing/*`, `README.md`, `/pro`, `/pricing`  
**Do:**
- Reposition per §9 landing  
- README: new problem/solution; remove social-as-core claims  
- Pro page sells path velocity  
**Acceptance:**
- Logged-out landing never sells feed/heatmap as the product  
- README matches shipped v1 scope  

---

### WS12 — Tests & CI hygiene
**Depends on:** ongoing  
**Known issue:** `lib/people-search.test.ts` fails when `OPENAI_API_KEY` is set (fake client missing `use_ai_quota`). Fix if people-search remains; otherwise delete with WS10/C.  
**Do:**
- Tests for diagnosis JSON validation, recipe fallback, recipe render smoke
- SQL RLS tests for owner CRUD, cross-user read/write denial, and anon denial on every new learner-data table
- SQL quota tests covering every new kind and its free/Pro boundary
- Ensure CI doesn’t rely on piping that swallows exit codes  
**Acceptance:**
- `npm test`, `npm run typecheck`, `npm run build` (with env) green on Node 24  

---

### WS13 — Phase C code deletion (later)
**Depends on:** WS10 stable in prod  
**Do:** delete feed/clubs/heatmap UI modules, Eve, people-search product paths  
**Do not** drop tables until analytics confirm zero need  

---

## 13. Suggested agent parallelization

```text
Week-shaped waves (no calendar promises — dependency waves):

Wave A (parallel):  WS1 schema
Wave B (parallel after A):  WS2 intake/AI  |  WS5 applications  |  WS7 helpers
Wave C (after A+B start):   WS3 recipe home  →  WS4 nav  →  WS6 jobs wire
Wave D:  WS8 projects + skill stages + interview banks  |  WS9 rediagnosis
Wave E:  WS10 deprecate  |  WS11 landing/README
Wave F:  WS12 tests harden  →  WS13 delete later
```

**Conflict hotspots (serialize or one owner):**
- `LeftNav.tsx` / `MobileNav.tsx` (WS4 vs others)  
- `lib/ai-prompts.ts` (WS2/WS8)  
- `types/database.types.ts` (WS1 first; others rebase)  
- `README.md` / landing (WS11 last for copy accuracy)  

---

## 14. Out of scope (v1)

- Full interview video simulator  
- Auto-apply / browser agents  
- Native mobile / PWA  
- Rebuilding follow graph or feed “for engagement”  
- Freeform AI-generated HTML/CSS layouts  
- Recruiter-paid distribution  
- Dropping Supabase / rewriting in another framework  
- **Static ResuMax-style roadmap catalog as primary IA** (`/roadmaps` mall, 12 role pickers)  
- **Project product that is mostly outbound links** to third-party tutorials  
- Replacing LeetCode / CS50 wholesale (secondary refs OK)  
- Building 500+ question banks on day one (seed high-ROI companies; AI fallback for the rest)  

---

## 15. Definition of done (v1 ship)

- [ ] Brand-new user, zero friends: intake → personalized recipe home → first task in one session  
- [ ] Three fixture users (`studio`, `ops_desk`, `prep_room`) visibly different first viewports  
- [ ] Applications tracker works end-to-end  
- [ ] Job fit + pitch reachable from path  
- [ ] Helpers only if experience + `open_to_help`  
- [ ] Feed/clubs/heatmap unreachable from primary nav  
- [ ] Diagnosis free; Pro meters at least pitch and/or interview prep  
- [ ] Landing + README describe zero-to-internship product  
- [ ] Typecheck, tests, build pass on Node ≥24  
- [ ] At least one native project completable fully in-app (checklist → done → dossier hook)  
- [ ] Skill-stage progress visible inside `studio` without a separate roadmaps product  
- [ ] `prep_room` loads a seeded company interview bank with approach + evaluating  

---


## 16. Agent prompt templates (copy/paste)

### Schema agent
> Implement WS1 from `ZERO_TO_INTERNSHIP_RESTRUCTURE.md`. Add migration + RLS for versioned intake_responses, learner_profiles, path_plans, path_tasks, applications, profiles.open_to_help, and experiences.company_slug. Extend ai_usage.kind and use_ai_quota for every new path quota kind. Add owner/cross-user/anon SQL tests and update types/database.types.ts. Do not build UI. Open PR against main.

### Intake agent
> Implement WS2 from `ZERO_TO_INTERNSHIP_RESTRUCTURE.md`. Replace social onboarding with struggle-aware intake; add INTAKE_DIAGNOSIS_SYSTEM; persist learner_profiles + path_plans; validate ui_recipe enum with heuristic fallback. Depends on WS1 merged.

### Recipe home agent
> Implement WS3+WS4 from `ZERO_TO_INTERNSHIP_RESTRUCTURE.md`. Build `/home` with five recipe layouts; retarget LeftNav/MobileNav to Home/Opportunities/Applications/Messages/Profile/Pro. No generative HTML. Follow existing visual tokens (Figtree/Fraunces/--blue).

### Helpers agent
> Implement WS7 from `ZERO_TO_INTERNSHIP_RESTRUCTURE.md`. Add open_to_help consent; filter job-detail peers; harden org match; wire help ask → 1:1 DM icebreaker.

### Deprecate social agent
> Implement WS10 from `ZERO_TO_INTERNSHIP_RESTRUCTURE.md`. Redirect feed/community/saved/post routes to `/home`; disable weekly-matches and eve in vercel.json; remove nav entries. Do not drop DB tables.

---

## 17. Risk register

| Risk | Mitigation |
|---|---|
| Recipe sprawl / mushy personalization | Freeze 5 recipes; validate enum; design reviews on fixtures |
| ChatGPT-wrapper feel | Home is structured modules, not a chat box |
| Social relapse when helpers empty | Solo path must feel complete; helpers secondary |
| AI cost blowups | Quota kinds; cache diagnosis; smaller model for free |
| Org match false positives | Slug normalization; show helper only on confident match |
| Scope creep (rebuild everything) | Phase A/B/C; schema delete last |
| people-search tests env-flaky | Fix or delete with people-search retirement |

---

## 18. File map (quick reference)

| Concern | Paths |
|---|---|
| App shell / nav | `app/(app)/layout.tsx`, `components/layout/LeftNav.tsx`, `MobileNav.tsx` |
| Onboarding today | `app/(app)/onboarding/`, `components/onboarding/OnboardingWizard.tsx` |
| Jobs + peers | `app/(app)/jobs/`, `app/(app)/jobs/[id]/page.tsx` |
| AI | `lib/ai.ts`, `lib/ai-prompts.ts` |
| Experiences | `components/profile/ExperienceEditor.tsx`, `experiences` table |
| Landing | `components/landing/LandingPage.tsx` + section components |
| Crons | `vercel.json`, `app/api/cron/*` |
| Types | `types/database.types.ts` |
| Product bible today | `README.md` (rewrite in WS11) |

---

## 19. Concise restatement (for kickoff messages)

> Rebuild samehere into an AI-native zero-to-internship Primer: struggle-aware intake, per-user UI recipes (`studio` / `ops_desk` / `prep_room` / `focus_track` / `network_gap`), application tracker, jobs fit/pitch, and opt-in company helpers via experience + `open_to_help`. Content substrates (native in-app projects, skill-stage tracks without a roadmap mall, company interview banks) feed recipes — they are not a ResuMax clone. Cut feed/clubs/heatmap/follows from primary UX. Solo-first. Free diagnosis; Pro for velocity. Surgical pivot on the existing Next.js/Supabase repo — see `ZERO_TO_INTERNSHIP_RESTRUCTURE.md` §5A.
