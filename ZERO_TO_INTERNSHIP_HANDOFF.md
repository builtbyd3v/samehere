# samehere zero-to-internship handoff

Last updated: 2026-08-12

This document is the starting point for the next implementation chat. It records the product decisions, current branch state, shipped behavior, verification status, known gaps, and the order of work.

## 1. Start here

Read these files before changing code:

1. `ZERO_TO_INTERNSHIP_HANDOFF.md`
2. `ZERO_TO_INTERNSHIP_RESTRUCTURE.md`
3. `README.md`
4. The recent commits on `cursor/z2i-implementation-b75f`

Then run:

```bash
git status -sb
git log -8 --oneline
npm test
npm run typecheck
```

Do not restart the product from scratch. Continue the existing branch and preserve the shipped path architecture.

## 2. Repository and pull request

- Repository: `https://github.com/builtbyd3v/samehere`
- Base branch: `feat/zero-to-internship`
- Working branch: `cursor/z2i-implementation-b75f`
- Draft pull request: `https://github.com/builtbyd3v/samehere/pull/19`
- Handoff revision: `70b7dde` (`fix(prep): grade answers without AI`)
- Product plan: `ZERO_TO_INTERNSHIP_RESTRUCTURE.md`

Phase 1 core-loop verification is done on this branch. Continue from Phase 2.

## 3. Agent operating model

The main chat is the coordinator:

- This Cloud Agent parent is Grok 4.6 High Fast (`cursor-grok-4.6-high-fast`)
- Responsibilities: product planning, task boundaries, architecture decisions, reviewing diffs, integration, testing decisions, and final sign-off
- It should avoid doing broad implementation work when a bounded implementation task can be delegated safely.

Implementation agents:

- Prefer Grok 4.6 Extra High Fast when the Task API lists `cursor-grok-4.6-xhigh-fast`.
- On Cloud Agents, the Task allowlist still omits Grok 4.6 slugs even when the parent is Grok 4.6. Do not substitute Grok 4.5.
- In that case, omit Task `model` so workers inherit the parent (`inherit-parent` in `~/.cursor/rules/pstack-models.mdc`).
- Desktop/non-cloud chats can pin Extra High Fast directly when the slug is listed.

Desired Cloud Agent role policy until the Task catalog includes Grok 4.6:

```text
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
swarm workers: inherit-parent
```

Keep planning, judgment, synthesis, and final review in the parent thread.

Delegation rules:

1. Give each agent a bounded outcome and exact file ownership.
2. Avoid overlapping files across parallel agents.
3. Ask each agent to return changed files, tests run, and remaining risks.
4. Review every diff in the main thread before accepting it.
5. Run repository-level checks after integration, even if each agent ran local tests.
6. Use isolated worktrees only when parallel changes would otherwise conflict.
7. Commit each logical change separately.

## 4. Current development environment

The dev server was started in tmux session `samehere-dev`.

```bash
tmux -f /exec-daemon/tmux.portal.conf attach-session -t samehere-dev
```

Current URLs:

- Local: `http://localhost:3000`
- Network: `http://172.30.0.2:3000`

Last observed server state:

```text
Next.js 16.2.9 with Turbopack
.env.local loaded
Ready in 216ms
GET / 200
GET /home 200 for an authenticated browser session
GET /jobs 200
GET /applications 200
GET /prep 200
```

For an unauthenticated request, `/home` redirects into auth. That is expected.

Do not kill the dev server when testing is complete. Leave it available for the user and follow-up agents.

## 5. Product definition

samehere is now an adaptive zero-to-internship AI coach. It is no longer a student feed with jobs attached.

Core loop:

```text
Signup
  -> struggle-aware intake
  -> diagnosis
  -> fixed UI recipe selected for the learner
  -> one useful next move
  -> project, application, interview, or helper action
  -> outcome recorded
  -> path re-diagnosed when facts change
```

The AI chooses among shared components and five fixed recipes. It does not generate arbitrary HTML.

Recipes:

- `studio`: build proof through an assigned native project
- `ops_desk`: rank opportunities and move applications
- `prep_room`: prepare for a live OA or interview
- `focus_track`: reduce the interface to one next move
- `network_gap`: prioritize opted-in company helpers

The product should feel visibly different across learner stages while using the same component system.

## 6. Locked product decisions

### Information architecture

The signed-in top navigation is:

```text
Path · Opportunities · Applications · Prep · Messages
```

- No left sidebar.
- `nav_emphasis` may reorder or emphasize path items.
- Projects and skill tracks are inputs to the adaptive path, not primary catalog navigation.
- Helpers are embedded in opportunity and path contexts.

### Product boundaries

Keep:

- Auth
- Learner intake and path plans
- Native project workspaces
- Internship dossier
- Opportunities, fit analysis, pitches
- Application tracker
- Company interview banks and feedback
- Opt-in helpers and one-to-one DMs
- Trust, safety, settings, and billing

Remove from the primary experience:

- Feed
- Posts and reactions
- Clubs
- Heatmaps and streaks
- Leaderboards
- Follow graph
- Suggested peer discovery
- Group-DM creation
- Social onboarding

Do not reintroduce:

- A left sidebar
- A browsable roadmap mall
- A large projects catalog as a second home
- External tutorials as the primary project experience
- Generic dashboard cards that ignore the learner's stage

### Helper matching

A user appears as a company helper only when:

1. They have an `internship`, `job`, or `research` experience matching the company.
2. `profiles.open_to_help = true`.

Project experiences must never qualify a user as a company helper.

### Pricing

| Plan | Monthly | Yearly |
|---|---:|---:|
| Free | $0 | $0 |
| Pro | $12 | $99 |
| Ultra | $29 | $249 |

Both paid plans are subscriptions.

Stripe environment variables:

```text
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_YEARLY
STRIPE_PRICE_ULTRA_MONTHLY
STRIPE_PRICE_ULTRA_YEARLY
```

Pricing copy and display values live in `lib/pricing.ts`.

The first diagnosis, recipe home, and core path remain free. Paid plans sell speed and depth.

## 7. AI configuration

The existing AI client uses the OpenAI-compatible SDK against Anthropic.

Known working setup:

```text
OPENAI_BASE_URL -> Anthropic-compatible endpoint
Free model -> claude-haiku-4-5
Pro model -> claude-sonnet-5
```

The key in `.env.local` is an Anthropic key, not an OpenAI key.

Do not:

- Print keys.
- Commit `.env.local`.
- Replace the base URL with `api.openai.com` while using the Anthropic key.
- Assume a missing AI response means the product should crash. Heuristic diagnosis is the fallback.

Test credentials are stored as:

```text
E2E_TEST_EMAIL
E2E_TEST_PASSWORD
```

Use them without printing their values.

## 8. Shipped implementation

### Brand and logged-out pages

- The samehere brand mark stays pinned top-left.
- The morph animation plays once per full page load.
- Client navigation keeps the settled wordmark.
- Auth pages use bare brand chrome without the nav hairline.
- Landing pricing shows Free, Pro, and Ultra with aligned CTA areas.
- The footer mark scrolls the landing page to the top.
- The landing metrics strip uses `Free / Ship / Prep` and a join CTA.

Primary files:

- `components/brand/AppBrandLink.tsx`
- `components/brand/BrandChrome.tsx`
- `components/landing/MetricsStrip.tsx`
- `lib/pricing.ts`

### Signed-in design system

Shared page components live in:

- `components/app/AppPrimitives.tsx`

Available components include:

- `AppPage`
- `AppPageHeader`
- `AppPanel`
- `AppNotice`
- `AppEmptyState`

Migrated signed-in routes:

- `/home`
- `/jobs`
- `/jobs/[id]`
- `/applications`
- `/messages`
- `/prep`
- `/prep/[company]`
- `/projects/[slug]`
- `/settings`

The signed-in product uses the dark landing-xai visual language.

### Adaptive path home

`/home` loads live path state. It no longer renders a fake `url-shortener` home for missing users.

Main data loader:

- `lib/path/load-home-data.ts`

It loads:

- Open path tasks
- Assigned project and checklist progress
- Diagnosis strengths, gaps, and blockers
- Current skill stage
- Live OA or interview context
- Matching company helpers

Main renderer:

- `components/path/PathHome.tsx`

Recipe components:

- `components/path/recipes/StudioHome.tsx`
- `components/path/recipes/OpsDeskHome.tsx`
- `components/path/recipes/PrepRoomHome.tsx`
- `components/path/recipes/FocusTrackHome.tsx`
- `components/path/recipes/NetworkGapHome.tsx`

The first open task leads the hero. Starting it changes `todo` to `doing` before navigation.

### Intake and re-intake

Onboarding is now:

```text
Basics -> education -> experience -> struggle intake -> diagnosis -> path home
```

There are no follow or post steps.

The shared intake form lives in:

- `components/path/PathIntakeForm.tsx`

`/path/redo` now renders the full intake with the latest answers prefilled. Submitting writes a new intake version and a new diagnosis. The compact home action still supports re-running a diagnosis from current answers and live application/project context.

Important files:

- `app/(app)/onboarding/actions.ts`
- `app/(app)/path/redo/page.tsx`
- `lib/path/diagnose.ts`
- `lib/path/rediagnose.ts`
- `lib/path/intake-options.ts`

### Native projects and dossier write-back

Native project seeds:

- `lib/path/seeds/projects.ts`

Project workspace:

- `app/(app)/projects/[slug]/page.tsx`
- `components/path/ProjectChecklist.tsx`

Checklist progress persists to `user_projects.checklist_state`.

On first completion:

1. The linked or first open `project_plan` task is marked done.
2. The project page shows dossier-ready bullet lines.
3. `Add to dossier` inserts an idempotent `project` experience.
4. Open dossier path tasks are marked done.
5. The user can edit the generated experience through the existing dossier editor.

Important files:

- `app/(app)/projects/actions.ts`
- `components/path/ProjectCompletionPanel.tsx`
- `lib/path/dossier-draft.ts`
- `lib/path/project-completion.ts`

Required migration:

- `supabase/migrations/20260812180000_experience_project_kind.sql`

This migration adds `project` to the `experiences.kind` constraint.

Applied to the live samehere project `gannghfikhikdeqvyrwc` as `experience_project_kind` (schema_migrations version `20260812163907`). Rolled-back SQL checks passed: owner can insert `kind=project`; invalid kinds still fail `23514`; a second user cannot insert/update/delete another user's project row; anon cannot select; project rows are excluded from helper-matching kinds (`internship|job|research`).

### Opportunities and AI fit

The opportunities page is listings-first.

- Compact filters stay above the listings.
- The AI fit assistant uses a bounded sticky rail on desktop.
- Ranked results scroll independently inside the assistant.
- Fit reasons annotate listing rows.
- Mobile avoids nested scrolling.

Main files:

- `app/(app)/jobs/page.tsx`
- `app/(app)/jobs/MatchesSection.tsx`
- `app/(app)/jobs/actions.ts`
- `app/(app)/jobs/[id]/page.tsx`

A live Claude refresh was verified with the authenticated test account.

Walkthrough artifact:

```text
/opt/cursor/artifacts/opportunities_ai_fit_scroll_and_claude_analysis_demo.mp4
```

### Applications and prep

- Applications support listing-linked and manual rows.
- OA and interview statuses trigger best-effort re-diagnosis.
- An OA or interview can switch the user into `prep_room`.
- Prep shows company interview banks, written answers, and feedback.
- If the model is unset or `generateText` returns nothing, `submitInterviewAnswer` uses a local rubric from the bank's approach/evaluating text instead of failing closed.
- Projects are not presented as a prep catalog.

Main files:

- `app/(app)/applications/actions.ts`
- `app/(app)/applications/page.tsx`
- `app/(app)/prep/page.tsx`
- `app/(app)/prep/[company]/page.tsx`
- `lib/path/interview-feedback.ts`
- `lib/path/seeds/interview-banks.ts`

### Helpers

Helper matching uses:

- `experiences.kind` in `internship`, `job`, or `research`
- Company slug when available
- Organization-name fallback
- `profiles.open_to_help = true`
- Self and blocked-user exclusion

Main files:

- `lib/path/home-helpers.ts`
- `app/(app)/jobs/[id]/page.tsx`
- `app/(app)/messages/`

### Removed chrome and social navigation

- Legacy left and mobile navigation were deleted.
- Club detail redirects to `/home`.
- Saved and Referrals were removed from account navigation.
- The top path navigation is the signed-in navigation.

Do not confuse removal from navigation with complete Phase C deletion. Much of the old social code still exists.

## 9. Current verification baseline

After Phase 1:

```text
npm test
24 test files passed
145 tests passed

npm run typecheck
passed

npm run build
passed with Next.js 16.2.9

npm run lint
0 errors
10 warnings
```

The lint warnings predate the path loop and are not blockers. Do not turn the next product slice into an unrelated lint cleanup.

Authenticated core loop was exercised in the browser:

```text
login
  -> onboarding intake (no_experience, Google, this cycle)
  -> studio home + URL Shortener API
  -> required checklist complete
  -> Add to dossier (idempotent; one project experience)
  -> Google SWE Intern -> Interview
  -> home recipe prep_room
  -> /prep/Google answer + rubric feedback
```

Walkthrough artifact:

```text
/opt/cursor/artifacts/z2i_core_loop_walkthrough.mp4
```

Screenshots:

```text
/opt/cursor/artifacts/screenshots/z2i_studio_home.webp
/opt/cursor/artifacts/screenshots/z2i_project_complete_dossier.webp
/opt/cursor/artifacts/screenshots/z2i_application_interview.webp
/opt/cursor/artifacts/screenshots/z2i_prep_room_home.webp
/opt/cursor/artifacts/screenshots/z2i_interview_feedback.webp
```

## 10. Known gaps and risks

### Release and data risks

- The `project` experience migration is applied on the live samehere project. Other environments still need the same constraint if they are not that project.
- The new dossier action still handles a missing migration with a friendly error.
- `supabase/tests/rls_test.sql` covers owner/cross-user/anon on `experiences`, but does not yet have a dedicated `kind=project` case. Live rolled-back checks passed.
- Interview feedback is computed in the request and stored on `interview_practice`, but the prep page does not rehydrate prior answers after refresh. The in-session grade still works.

### Product gaps

- The public/private profile still reads like a social profile. Posts, followers, and heatmap remain prominent.
- Recommendation feedback does not exist. The coach cannot yet learn whether the previous move helped.
- Project completion updates path tasks but does not automatically re-diagnose readiness.
- The first application and stalled-application triggers are incomplete.
- Weekly re-diagnosis is not implemented.
- Ultra is mostly pricing copy. Runtime entitlements do not clearly distinguish it from Pro.
- Old social routes, crons, emails, and modules remain in the repository.

### Architecture risks

- Avoid adding a general event framework before the minimum feedback loop proves it is needed.
- Keep learner memory structured and auditable. Do not store an opaque, ever-growing prompt transcript as the source of truth.
- Keep AI output behind strict parsers and fixed recipe enums.
- Do not allow a failed AI call to block the free core loop.
- Continue to validate all ownership-sensitive writes with Supabase RLS and user-scoped filters.

## 11. Next implementation plan

Work in this order. Each phase should leave a usable product and a reviewable commit.

### Phase 1: verify and harden the complete core loop

**Done** on 2026-08-12. Do not repeat it. Next work is Phase 2.

Goal: prove the current product works as one story before adding more behavior.

Flow to test:

```text
Login
  -> full re-intake
  -> diagnosis
  -> recipe home
  -> start assigned project
  -> complete required checklist
  -> add generated project to dossier
  -> add or advance an application
  -> move application to OA/interview
  -> observe prep_room
  -> answer one company-bank question
  -> receive AI feedback
```

Tasks:

1. Identify the linked Supabase project.
2. Confirm migration state.
3. Apply `20260812180000_experience_project_kind.sql` to the correct project.
4. Verify the constraint and owner-only write behavior.
5. Run the authenticated flow in the browser.
6. Fix only blockers found in this flow.
7. Record a short successful walkthrough video.

Acceptance:

- A project experience appears in the dossier once, even if the button is clicked again.
- The matching dossier task is done.
- Moving an application to interview shows `prep_room`.
- A company question can be answered and evaluated.
- No page in the flow requires the old social UI.
- Server and browser console have no new errors.

Suggested delegation:

- One Grok 4.6 implementation agent owns migration verification and any database fix.
- One Grok 4.6 implementation agent owns code fixes discovered during the walkthrough.
- The Sol main thread runs the final flow and reviews both diffs.

Do not parallelize browser state mutation against the same test account.

### Phase 2: turn profile into the internship dossier

Goal: make the user's proof, not social activity, the main profile.

Scope:

- `app/(app)/profile/[username]/page.tsx`
- `app/(app)/profile/edit/page.tsx`
- `components/profile/ExperienceEditor.tsx`
- Related profile-only components

Tasks:

1. Lead with headline, target role, education, experience, and projects.
2. Label project experiences clearly.
3. Keep generated project bullets editable.
4. Remove posts, reposts, followers, following, contribution heatmap, and social counts from the primary profile layout.
5. Keep trust controls, privacy behavior, and block/report actions.
6. Preserve compatibility with existing experience rows.

Acceptance:

- A recruiter can understand the learner's role target and proof in the first viewport.
- Project, internship, job, research, and education entries remain legible.
- No social metric is needed to make the profile feel complete.
- Existing profile URLs continue to work.

This is a redesign and deletion pass, not a new resume builder.

### Phase 3: add recommendation feedback and learner memory

Goal: let the coach learn whether its last recommendation worked.

Minimum feedback vocabulary:

```text
helped
not_relevant
stuck
```

Recommended minimal data model:

- Tie feedback to `user_id` and `path_task_id`.
- Store one enum outcome.
- Allow an optional short note for `stuck`.
- Store timestamps.
- Use owner-only RLS.

Tasks:

1. Add the smallest migration and generated types required.
2. Add feedback controls to the active next move.
3. Mark useful outcomes without forcing a re-intake.
4. Feed the latest task outcomes into re-diagnosis prompts and deterministic fallbacks.
5. For `stuck`, allow a short blocker note and produce a different next move.
6. Keep completed and skipped task history.

Acceptance:

- A user can rate the active recommendation in one click.
- `stuck` changes the next diagnosis context.
- The prior recommendation and its outcome are visible to the server-side diagnosis.
- Cross-user reads and writes fail.
- Invalid outcomes cannot persist.

Avoid a generic analytics event bus. A focused path-feedback table is enough for this phase.

### Phase 4: close automatic re-diagnosis triggers

Goal: adapt the path when observable recruiting facts change.

Triggers:

- First application created
- Application moves to `oa`
- Application moves to `interview`
- Project first completes
- Recommendation marked `stuck`
- Optional weekly refresh after event-driven triggers are stable

Behavior:

- First application may move a ready learner toward `ops_desk`.
- OA/interview must favor `prep_room`.
- Project completion should update readiness and may graduate `studio`.
- `stuck` should avoid returning the exact same move without explanation.

Acceptance:

- Triggers are idempotent.
- User actions remain successful even if re-diagnosis fails.
- Task history remains intact.
- The UI recipe changes only when facts justify it.
- Free users retain deterministic fallback behavior.

Do not add the weekly trigger until event-driven transitions are reliable.

### Phase 5: enforce Pro and Ultra as real entitlements

Goal: make the paid plans differ in code, not only on pricing cards.

Current issue:

- The app primarily understands Free versus Pro.
- Ultra checkout copy exists, but the runtime does not consistently identify or enforce Ultra.

Tasks:

1. Audit Stripe checkout, webhook handling, profile billing fields, and `isPro`.
2. Introduce a single plan resolver with `free | pro | ultra`.
3. Keep subscription source-of-truth fields explicit.
4. Map quota and model behavior by plan.
5. Make the recipe-aware home upsell point at an action relevant to that recipe.
6. Ensure billing portal and cancellation preserve correct entitlement state.

Pro:

- More path re-diagnoses
- Listing pitches
- Deeper project plans
- Company interview feedback
- Stronger model and higher daily limits

Ultra:

- Highest model tier
- Higher or unlimited interview packs
- Concurrent active projects
- More frequent plan regeneration
- Higher-intensity recruiting-cycle support

Acceptance:

- Webhook tests cover Pro and Ultra subscription transitions.
- The UI can render the current plan accurately.
- A Pro user does not receive Ultra-only limits.
- A canceled or expired subscription loses paid entitlement correctly.
- The free path still works.

Do not invent Ultra benefits that the runtime cannot deliver.

### Phase 6: retire remaining social code

Goal: remove the old product after the adaptive loop is stable.

First disable or redirect:

- `/feed`
- `/community`
- `/saved`
- `/post/[id]`
- `/quote/[id]`
- `/leaderboard`
- People-search product routes
- Follow-list entry points

Then disable:

- Eve cron
- Weekly matches cron
- Social digest email behavior
- Social contribution writes

Finally delete:

- Feed components
- Club UI
- Heatmap UI
- Follow UI
- People-search code
- Obsolete tests and cron handlers

Keep database tables until analytics or explicit product decisions confirm they are no longer needed.

Acceptance:

- No primary or secondary navigation reaches old social routes.
- Old external links redirect safely.
- Vercel cron configuration no longer runs old jobs.
- Build, tests, and typecheck pass after deletion.
- Auth, messages, trust, and settings remain intact.

## 12. Parallelization map

Safe early split after Phase 1:

| Agent | Scope | Files |
|---|---|---|
| Grok 4.6 A | Dossier profile redesign | `app/(app)/profile/**`, `components/profile/**` |
| Grok 4.6 B | Feedback schema and server actions | new migration, types, `app/(app)/home/actions.ts`, `lib/path/**` |
| Grok 4.6 C | Paid entitlement audit, read-only first | Stripe, billing, pricing, webhook files |
| Sol main | Review, integration, browser verification | Whole diff, no competing implementation ownership |

Do not start paid entitlement implementation until the audit identifies the current subscription source of truth.

Do not start Phase C social deletion while profile redesign still imports feed and heatmap components. Let the profile diff land first.

## 13. Testing requirements

For every implementation slice:

```bash
npm test
npm run typecheck
npm run lint
```

Run `npm run build` before handoff, PR updates, or when changing:

- App Router boundaries
- Server actions
- Middleware or proxy behavior
- Environment-dependent code
- Stripe
- Supabase-generated types

For Supabase changes:

1. Confirm the target project.
2. Check current migrations.
3. Apply the migration once.
4. Query the resulting schema.
5. Test owner, second-user, and anonymous access where RLS applies.
6. Run advisors when the available tooling supports it.

For UI changes:

1. Use the authenticated test account.
2. Test desktop and a phone-width viewport.
3. Check browser console and server output.
4. Record one short successful video for a complete flow.
5. Save only final successful artifacts.

Do not upload failing walkthroughs.

## 14. Review checklist for the Sol main thread

Before accepting an implementation agent's diff:

- Does it advance the zero-to-internship loop?
- Does it preserve the fixed five-recipe model?
- Does it avoid social-network assumptions?
- Does it keep the first useful path free?
- Does it use live user data instead of fixtures?
- Are user-authored strings treated as untrusted?
- Are server writes scoped to the authenticated user?
- Does Supabase RLS back up application checks?
- Is the smallest sufficient data model used?
- Are errors non-destructive and useful to the user?
- Are tests focused on the changed behavior?
- Does the UI still match the dark landing-xai system?
- Is the change understandable without reading an AI transcript?

Reject:

- Generic dashboard additions
- New catalog malls
- New outbound-tutorial dependencies
- Hidden cross-user reads
- Arbitrary AI-generated UI
- Model output persisted without validation
- Free-path failures when AI or quota is unavailable
- Ultra marketing without matching runtime behavior

## 15. First prompt for the new chat

Paste this into the new Sol coordinator chat:

```text
Continue the samehere zero-to-internship implementation.

Read ZERO_TO_INTERNSHIP_HANDOFF.md and ZERO_TO_INTERNSHIP_RESTRUCTURE.md first. Stay on cursor/z2i-implementation-b75f and use feat/zero-to-internship as the PR base. PR: https://github.com/builtbyd3v/samehere/pull/19.

Phase 1 is done: project-kind migration is on the live samehere Supabase project, the authenticated core loop was walked, and interview feedback has a local rubric fallback. Do not repeat that work.

This parent chat coordinates. If the Task API lists cursor-grok-4.6-xhigh-fast, use it for implementation. If not, inherit the parent and do not substitute Grok 4.5.

Start Phase 2: turn the public/private profile into the internship dossier. Keep the existing dev server if it is healthy. Delegate bounded implementation to Grok 4.6 (or inherit), review every diff here, run the full checks, commit, push, and update PR 19.
```

## 16. Handoff completion state

At the time this document was written:

- Branch changes through `70b7dde` were committed and pushed.
- Pull request 19 was updated.
- Dev server was healthy in tmux `samehere-dev`.
- Tests (145), typecheck, lint (0 errors / 10 warnings), and production build passed.
- Phase 1 core-loop verification is done.
- Next task is Phase 2: internship dossier profile.
