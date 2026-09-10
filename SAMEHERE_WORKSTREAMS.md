# Samehere worker assignments

Follow [the implementation spec](SAMEHERE_IMPLEMENTATION_SPEC.md). This is a planning artifact owned by the primary assistant. Workers implement assigned changes and run checks; the primary assistant alone chooses scope, dispatches work, reviews results, and accepts corrections.

## Dispatch rules

- Run only after Git/workspace and provider preflight. Use the same checkout so the verified dev terminal continues serving it. Three workers at most; no nested agents, separate planners/reviewers, commits, merges, pushes, deployments, live migrations, or real billing/email actions in worker tasks.
- Each task is one bounded stage. Workers may inspect any source, including the landing source, but edit only their owned files. Shared-file changes outside ownership go back to the primary assistant as a precise request. The primary assistant assigns integration fixes; workers do not expand their own scope.
- Before a dependent task, the primary assistant inspects the predecessor's diff, contracts, and checks, then records that task ID in the next run's `reviewedTasks` argument. Worker completion alone does not satisfy a review boundary.
- Keep existing service configuration secret. Test schema changes against a verified disposable database, and billing with test fixtures/test mode. If a dependency or test environment is missing, report it precisely while completing independent code and tests.
- Return changed files, migrations/configuration required, checks with pass/fail/not-run reasons, screenshots/evidence paths, and unresolved issues. Return through the workflow result tool when a schema is provided. A task with unresolved required work reports `blocked`, not `complete`.

## Tasks and ownership

| ID | Work | Owned files | Reviewed predecessors |
| --- | --- | --- | --- |
| `data` | Add project/publication/connection/analysis/metrics records, feed labels, profile tags, RLS, atomic usage/lease functions, and shared DTOs. Add database tests and regenerate/safely update types. | New migrations and tests under `supabase/`; `types/database.types.ts`; new `types/portfolio.ts`; new `lib/portfolio/validation.ts` and associated tests. | None |
| `design` | Port x.ai-style landing implementation and truthful new demos; establish dark/light tokens, shell, primary navigation, mobile navigation, auth styling, and public landing metadata. Preserve current component behavior while restyling. | `components/landing/**`; `components/layout/**`; `components/ui/**`; `app/globals.css`; `app/layout.tsx`; `app/page.tsx`; `app/(app)/layout.tsx`; landing-specific public assets and top-level OG/Twitter image routes. | None |
| `social` | Optional labels/tags in social discovery; normal ranked search; remove existing feed/DM AI affordances; preserve DMs, group conversations, reactions, notifications, and signup/referral behavior. Disable clubs/jobs/leaderboard and retired cron/API behavior. | `components/feed/**`; `components/messages/**`; `components/search/**`; `components/onboarding/**`; corresponding feed/messages/search/onboarding/community/jobs/leaderboard routes/actions; `app/auth/**`; `lib/search.ts` and tests; legacy `lib/people-search*`, `lib/match*`, `lib/connection-prompt*`; retired feature libraries/components; `lib/emails/welcome.ts`, weekly-match template; existing retired cron routes/tests; `lib/supabase/middleware.ts`; `vercel.json`. | `data`, `design` |
| `portfolio` | Manual project CRUD/editor, public projection and owner preview, publication controls, open-to editor, project ordering, links/sharing, source-aware heatmap UI, profile metadata/images. Remove old profile AI UI. | `components/profile/**`; new `components/portfolio/**` except `analysis/**`; `app/(app)/profile/**`; new `lib/portfolio/**` except shared `validation*` and metrics files; profile-specific OG/Twitter routes; new portfolio CRUD API routes outside `/analyses`. | `data`, `design` |
| `github-analysis` | Dedicated GitHub connect flow, encrypted credentials, public repository picker data, contribution cache/sync, bounded persisted analysis processor/status/retry/cancellation, quotas/cost records, and analysis UI. | New `lib/github/**`, `lib/repository-analysis/**`; new `app/api/integrations/github/**`; new `app/api/portfolio/analyses/**`; new `app/api/cron/github-sync/**`; new `components/portfolio/analysis/**`; analysis-specific prompt/client module; `.env.example`; `vercel.json` after `social`. | `data`, `social` |
| `pro-referrals` | Pro capability mapping, aggregate metrics and UI, revised Pro/referral copy and presentation, preservation of current pricing/grants/qualification. Integrate analytics into finished profile views through narrow edits. | `app/(app)/pro/**`; `app/pricing/**`; `app/(app)/referrals/**`; `components/referrals/**`; `components/landing/Pricing.tsx` after `design`; `lib/pro.ts` and tests; new `lib/portfolio/metrics*`; new metrics API/routes/components; narrow metric imports/rendering in profile files after `portfolio`. | `data`, `design`, `portfolio`, `github-analysis` |
| `integration` | Connect the finished editor and analysis flow, complete typed imports/DTO wiring, add meaningful end-to-end verification, and fix build/test failures from the combined work. Remove remaining obsolete references identified by checks. | Integration edits across files from completed stages; new end-to-end tests and necessary dev-only test configuration. Root specifies any additional fixes discovered in its reviews. | `social`, `portfolio`, `github-analysis`, `pro-referrals` |

No migration or generated database-type edits outside `data` without a new explicit assignment from the primary assistant. A later schema correction is a separate `data` follow-up and requires review before affected workers resume. Avoid dependencies or package changes unless needed; request ownership of package files from the primary assistant before editing them.

## Completion criteria

- `data`: DTO fields/enums/errors documented; old records preserve visibility; owner/anonymous/other-user RLS cases, credential isolation, quota races, stale leases, and connection-epoch invalidation covered by meaningful tests. Migrations are prepared locally and clearly marked applied/not applied.
- `design`: landing and shell match the existing redesign's character; demos describe the approved scope; responsive/keyboard/reduced-motion states checked; links target real app destinations; no fake success or product statistics.
- `social`: login enters feed while recovery works; existing feed/DM interactions survive; text search/filter tests cover blocked/private data and pagination; retired actions/cron endpoints cannot continue side effects.
- `portfolio`: a manually created project can be saved privately, edited, published, viewed anonymously when permitted, shared, unpublished, and deleted. A blocked/private/draft project never leaks through search/metadata/public APIs. Existing private education/experience remain private by default.
- `github-analysis`: fixtures exercise connect/state/identity checks, public-only selection, commit-pinned extraction limits, structured results, interrupt/retry/cancel, duplicate requests, quotas, and cached reads. Record whether real OAuth/model checks occurred; fixture success is not live integration success.
- `pro-referrals`: Free and Pro behavior is consistent server/client; existing expiry/referral grants and checkout contracts remain intact; aggregate counts exclude owner/private previews; no named visitor information added.
- `integration`: required repository lint/typecheck/tests/build/OG checks run; publish/share/social flow exercised in an approved test environment; user-facing and operational blockers returned with exact evidence. The primary assistant performs the final review and browser checks.

## Planned runs

1. `data` + `design` concurrently; primary assistant reviews both.
2. `social` + `portfolio` concurrently; primary assistant reviews each.
3. `github-analysis` after `social` review; primary assistant reviews it.
4. `pro-referrals`; primary assistant reviews it.
5. `integration`; primary assistant reviews the combined result and assigns corrections to the responsible worker.

The saved `.bb/workflows/samehere-implement-stage.js` dispatches only selected tasks and returns after that run. It does not automatically proceed past a primary-assistant review boundary.

## Final local implementation state — September 10, 2026

All implementation stages and root correction reviews are complete. Workers are idle. The user requested review before further release work; no commits, hosted migrations, deployment, real billing/email actions, or secret changes were performed.

- Provider selection remained Cursor `acp-cursor`, `grok-4.6`, `xhigh`, `fast`. The saved workflow was not run because its runner cannot enforce `serviceTier`; equivalent stages used BB child threads with explicit fast service. Root alone planned and reviewed. Kanban remains disabled by user instruction.
- Accepted workers: data `thr_gtmcdcpqxa`, design `thr_maxwaha9nm`, social `thr_79k8vbnfh2`, portfolio/UI `thr_uamepkxtua`, GitHub backend `thr_krzmbepzrv`, Pro/referrals `thr_275d7xms2x`, local harness `thr_a7iqnpizq5`. Reference research `thr_5qwaijk8bh` supplied measured x.ai screenshots and motion data.
- Final ownership adjustments: portfolio implemented `components/portfolio/analysis/**` and editor wiring; GitHub owned backend/config/middleware/cron. Pro owned migration `20260910120000` and narrow profile integration; data owned `20260910130000` finalization/snapshots. Shared type appends were reviewed and serialized.
- Feed/profile-led landing, shared auth/app surfaces, and logo alignment are accepted. Header glyph positions match at 1440 (x120.5/y18), 768 and 390 (x24/y18), size 28×28. The persistent app layout retains its settled logo across client navigation and router refresh. Public profile routes verified shared app chrome; this is not a live signed-in session test.
- Final checks: 55 Vitest files / 300 tests pass; TypeScript passes; ESLint on 230 changed source files reports zero errors and 53 warnings, mostly unused retired-stub arguments; production build passes with 52 static pages; 15 OG tokens match; `git diff --check` passes.
- Disposable PostgreSQL full migration replay passes on `pfh_20260910_035512_3_chain`. Real SQL tests pass: portfolio 38, social 14, Pro 13, finalization/snapshots 18; three overlapping transaction cases verify quota/idempotency behavior. Auth/storage platform stubs and non-executing cron limit fidelity. No hosted SQL was applied.
- Real workbench mounted with mocked API responses passes initial load, one analysis POST, repeated stage polling, failed-poll recovery, cancellation, success reload without a new POST, config/network failure recovery, long-path wrapping, reduced-motion behavior, and offscreen pixel pause. It does not verify live GitHub OAuth/model calls.
- Hosted schema and dedicated GitHub/metrics configuration remain missing. New backend features cannot be presented as live. Authenticated publish/share/social flows, billing, and email remain unverified. Existing feed repost queries can report missing `posts.context_label` before schema deployment.
- Dev terminal `term_8dtg54i5jq` serves `http://localhost:3000` after the completed production build. Disposable PostgreSQL remains in terminal `term_hrrxhs8r7p`, socket `/tmp/samehere-postgres-socket`, port 55439, no TCP listener.
- Nine unused landing files remain unreferenced after earlier rejected deletion requests; no retry was attempted.

Review artifact: `/home/Dev/.bb/thread-storage/thr_d8qs9vn2y5/review/README.md`, with screenshots, browser measurements, fixture results, and copied verification logs. Next step is user review of the running landing and shared page design.
