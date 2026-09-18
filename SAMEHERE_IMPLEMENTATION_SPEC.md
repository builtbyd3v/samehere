# Samehere implementation spec

Status: implementation started following the approved [release plan](SAMEHERE_RELEASE_PLAN_2026-09-10.md), September 10, 2026. Workers use Cursor (`acp-cursor`), Grok 4.6, xhigh, fast, as explicitly selected by the user. The primary assistant owns planning, orchestration, and review. See the workstreams document for active workers and dispatch details.

## 1. Product and release boundary

Samehere is a social network for CS/SWE students to share work, recognize shared struggles, meet peers, and maintain a shareable portfolio. Feed and DMs are primary experiences. Keep posts, comments, SameHere reactions, follows, reposts, saved posts, notifications, existing direct/group conversations, and essential account/privacy/moderation controls.

Include optional post labels **Building / Learning / Stuck** and optional profile tags **Open to collaborate / Study together / Feedback**. Ordinary search connects these interests to people and discussions. The only new model-powered flow converts a selected public GitHub repository into an editable portfolio project.

Remove clubs/Eve and their active entry points. Pause jobs, job actions, and ingestion while preserving records. Retire AI people ranking, match explanations, bio/DM/post generation, composer nudges, profile AI nudges, weekly match emails, and global leaderboard entry points. Preserve referrals and previously earned rewards. Club-role experience entries describe a student's background and remain valid after removing the clubs product. Preserve unrelated group DMs when disabling club channels.

Defer private-repository analysis, LeetCode/NeetCode import, custom domains, linked progress follow-ups, and the replacement jobs product.

## 2. Navigation and visual system

Desktop primary navigation: Feed, Messages, Profile, Search, Notifications; Saved, Pro, Invite friends, and Settings remain readily accessible secondary destinations. Mobile keeps feed, messages, profile, search, and notifications within a single persistent navigation system. Existing deep links to posts, quotes, conversations, and profiles continue working.

Normal login, OAuth signup, and email confirmation end at `/feed`. Password recovery still reaches `/update-password`; existing redirect validation stays intact. Move setup into a dismissible feed prompt. `/onboarding` may remain as an optional editor/deep-link destination, with AI matching removed. Preserve referral attribution through all signup paths.

The landing source is `/mnt/d/Workspace/samehere/.claude/worktrees/zero-to-internship/components/landing`, with its `.landing-xai` styles in `app/globals.css`, fonts in `app/layout.tsx`, and referenced local assets. Port that implementation selectively. Its internship-coach workbench and Build/Apply/Prepare content must become truthful previews of the new portfolio import, feed, and conversations.

Start with the source palette: canvas `#0a0a0a`, card `#1a1a1a`, white/off-white text, fine neutral borders, and selective blue. Preserve its Figtree typography, wordmark treatment, spacing, navigation motion, and hover character. Raise muted-text contrast where required for readable controls/body copy. Landing is dark. Internal app defaults to the new dark presentation for new users while preserving an existing explicit light/system preference with coherent light tokens.

Latest user direction, September 10: lead the landing hero with **feed and portfolio profiles**, showing student work and human connections. GitHub repository analysis is a supporting feature below the hero. A dedicated Cursor Grok research agent reviewed live x.ai desktop/mobile browser evidence and animation logs. The revised brief uses its large product-scene composition, 650ms staggered word reveal, restrained depth and borders, while preserving Samehere branding and reduced-motion support. Landing sequence: social/profile headline and composed product scene → deeper feed/profile/DM story → secondary repository-to-project preview → Free/Pro → referrals → signup/legal. Example content is labeled; publish no invented usage/customer statistics.

Keep the Samehere glyph blue on every surface, with the wordmark white “same” / blue “here” against the dark brand surface. Preserve the clean wordmark-to-glyph transition across landing and authentication. In the signed-in app, play the intro once on first full load, keep the settled mark through client navigation and router refresh, and make reduced motion static. No intro may block content or controls. Carry typography, material, spacing, icons, and control quality across all app pages. Inside the app, use brief state transitions and clear reading surfaces. Analysis gets the expressive animation: file-tree scan, active processing stage, and an emerging project preview. Animate only stages reported by the server, never a made-up percent or claims that an uninspected file was read. Reduced motion uses a static stage list. Background animation pauses when hidden; failure immediately replaces the loading state.

## 3. Feed, profile tags, and search

- Add nullable `posts.context_label` with values `building`, `learning`, `stuck`. Existing posts remain unlabeled. Composer selection is optional and removable; creating a post never requires AI. Labels render on feed/detail views and are searchable filters.
- Add `profiles.open_to` as an empty-by-default allowlisted array: `collaborate`, `study`, `feedback`. Users edit/remove tags in the profile editor. Tags obey profile visibility; no inference or automatic tagging. A tag is an invitation to message, not permission to bypass DM controls.
- Preserve reaction semantics and counts. DMs remain human-authored and use the existing membership/blocking/reporting protections.
- Search people by username/name, visible bio/background, open-to tags, and visible project text. Search projects by title, summary, technologies; search posts by text and optional context label. Rank deterministically: exact username/title, then matching terms, then recency with an ID tie-breaker. Paginate and cap page size at 20 per type. Parameterize database queries and apply visibility/block/suspension filtering before limit/pagination. Return an honest empty state when there is no match. No model calls, embedding service, or vector database in this release.

## 4. Portfolio behavior and data contracts

Keep `/profile/[username]` as the public address. Default order: introduction/links, featured projects, activity, experience/education, then recent posts where currently allowed. Counts remain secondary. Provide a prominent share button with native sharing and copy-link fallback, and an owner preview that reads exactly the public projection.

The owner can create a project manually, edit it, reorder it, publish/unpublish it, and delete it. Suggested limits: title 100 characters, summary 500, description 4,000, personal role 1,000, up to 12 technology tags and six key features. Validate link protocols as HTTPS/HTTP; do not render arbitrary HTML. The description supports safe plain text initially. A repository/demo link does not prove deployment or sole authorship.

Data owner defines the migrations and shared TypeScript DTOs in `types/portfolio.ts` before dependent workers start:

| Record | Required meaning |
| --- | --- |
| `portfolio_settings` | Owner, explicit section-publication settings, indexing opt-in, section order, and an update/version field. Newly exposed sections default private for existing users. |
| `portfolio_projects` | UUID, owner, manually editable title/summary/description/role, tags/features, validated repo/demo links, draft/published status, order, published timestamp, optional source repository ID/commit SHA and successful analysis ID. |
| `github_connections` | Owner, verified GitHub numeric ID/login, connection epoch, connected/reauthorization-needed state, sync timestamps and safe error status. Browser-readable owner data excludes credentials. |
| `private.github_credentials` | Server-only encrypted access/refresh tokens, expiry and key version, tied to connection epoch. Access through narrowly granted service-role-only RPCs; never an anonymous/authenticated table or function. |
| `github_contribution_days` | Connection/owner, provider date, count, level, fetched-at; unique connection/date. Public reads depend on publication settings and account visibility. |
| `repository_analyses` | UUID, owner, project/repository/SHA, connection epoch, request key, status/stage/timestamps, lease, retry lineage, private structured draft/evidence, model/prompt version, token usage, estimated cost when known, safe error. |
| `repository_analysis_usage` | Atomic reservation/settlement ledger by owner/month/analysis. Clients cannot choose their tier, cap, owner, or charged amount. |
| `portfolio_daily_metrics` | Owner/project/date aggregates for eligible public portfolio views and project-link clicks. This powers Pro analytics, not named visitor tracking. |

Every exposed table has explicit grants and RLS. Owner writes must check both old and new owner IDs. Private drafts, analysis rows, and unpublished sections are inaccessible to other users and anonymous clients. Existing `is_private`, blocking, suspension, and heatmap visibility take precedence. A private account cannot silently become public by enabling a portfolio switch; explain the conflict in the editor. Public metadata, OG/Twitter images, search, and direct links use the same published projection. Anonymous access must not be implemented by a service-role query that bypasses these rules.

Updating an already-published project uses a separate private analysis draft. A reanalysis never overwrites owner edits or the public version until the owner applies it. Unpublishing removes the project from public search, pages, and previews; publication/visibility changes invalidate affected caches.

## 5. GitHub connection and activity

Use a dedicated GitHub connect flow bound to the current authenticated Samehere user, separate from Supabase login so connecting a repository does not switch the logged-in Samehere account. Start with an OAuth app and the minimum scopes needed for public identity/activity. Use state plus PKCE where supported; verify the returned identity with GitHub. Store only encrypted credentials server-side. OAuth cancellation, mismatched state, revoked credentials, and token expiry have explicit recovery states. The current [GitHub OAuth guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) documents state, PKCE, identity verification, and expiring-token behavior; handle refresh tokens when provided.

Select from paginated public repositories available to the connected identity. Store the stable repository ID and resolve its current canonical name/commit on the server. Repository selection and analysis must verify that the repository remains public. For forks/team projects, require the student's role before publication; never equate all repository work with their contribution.

Fetch the rolling year on connection, then refresh daily through a bounded authenticated cron with persisted cursor/checkpoint, rate-limit backoff, and per-connection failures. Manual refresh is owner-only and throttled. Use GitHub contribution dates/counts/levels documented in [the contribution schema](https://docs.github.com/en/graphql/reference/users). Preserve GitHub dates and Samehere's existing Eastern-time dates. All/GitHub/Samehere filters show labeled per-day values; All uses activity presence or capped visual intensity, not summed points and contributions. A failed sync preserves the previous snapshot with its age; missing/stale data is not zero.

Disconnect rotates/inactivates the connection epoch, stops synchronization/analysis, and removes imported activity from the public projection. In-flight workers recheck the epoch before persisting or publishing results. Published project descriptions remain owner-controlled; disconnect does not delete their written portfolio. Account deletion removes associated credentials, drafts, cached contributions, and private metrics.

## 6. Repository-analysis workflow

Routes/contracts: owner-only project editor at `/profile/projects/[id]/edit`; create/status/retry endpoints under `/api/portfolio/analyses`; GitHub connect/callback/disconnect under `/api/integrations/github`; contribution refresh under `/api/cron/github-sync`. Exact request/response/error DTOs live in `types/portfolio.ts` and are reviewed before parallel UI/backend work.

1. Owner selects a repository and explicitly clicks **Analyze project**. Server authenticates the user, validates ownership/connection/public repository, checks tier/allowance, reserves quota atomically, and writes an analysis UUID before starting external work. Duplicate request keys return the existing record. One active analysis per owner/repository; a successful same-SHA/prompt-version result can be reused without another model call or quota charge.
2. Return an addressable analysis ID and schedule a bounded server processor. Use Next.js `after()` from the initiating POST, with a database lease, explicit per-call timeouts, a 90-second processing deadline, and a 120-second route duration where the deployment supports it. `after()` is bounded by route duration, not a durable queue; verify runtime support and retain this limitation in the implementation notes. See [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after).
3. Processor persists stage changes: `queued → reading_repository → analyzing → saving_draft → succeeded`; terminal alternatives are `failed` and `cancelled`. Owner status reads poll persisted state and never initiate another model call. An expired lease is presented as interrupted with an explicit Retry action; a terminated process must not leave an endless spinner. Each retry receives a new attempt ID. Expired workers cannot commit over a newer attempt.
4. Pin reads to a commit SHA. Read README, manifests, directory metadata, and a bounded sample of relevant text source using [GitHub contents APIs](https://docs.github.com/en/rest/repos/contents). Initial ceilings: 30 files, 32 KiB per file, 200 KiB total text, and approximately 12,000 input tokens including instructions/context. Skip binaries, vendored/generated content, lockfiles, credential files, symlinks/submodules, and arbitrary external URLs. Do not clone/install/build/execute repository code. Limit API pagination/tree traversal too, and report partial coverage rather than implying a complete code audit.
5. Send one bounded structured-generation request with at most 4,000 output tokens. Repository text is untrusted data; it cannot control tools, credentials, URLs, or instructions. Output contains a proposed title, summary, description, technology tags, key features, uncertainty notes, and source-path evidence. Validate structure and limits before storing. Missing information remains blank or a question for the owner. No invented test results, users, performance metrics, deployments, or personal accomplishments.
6. Save the private editable result and usage metadata before reporting success. A browser refresh returns to that result. Owner reviews evidence/coverage, edits the project, confirms their role, then publishes through a separate authenticated action. An optional share action opens the existing feed composer with a project reference; it never auto-posts or sends DMs.

Cancellation is best-effort for an already-started provider request; explain that publication has stopped, and discard late output through the attempt/epoch check. Do not automatically replay an uncertain billed request. Failed/invalid attempts do not consume the student's successful-analysis allowance, but attempts and actual provider usage remain in an abuse/cost ledger with an independent retry/rate cap. Missing configuration offers manual project creation and a clear unavailable state.

## 7. Pro, referrals, configuration, and retirement

Keep the current configured Stripe prices and mechanics: monthly subscription, one-time semester access, expiry-aware `isPro`, account-bound checkout/portal, signed/idempotent webhooks, and comped/referral grants. Add portfolio themes/banner, section ordering, aggregate 30-day views/link clicks, and higher analysis allowances. Free retains normal portfolio editing, projects, sharing, activity, and social actions. Expired Pro data remains saved; premium editing/analytics become unavailable while existing written projects stay accessible under their visibility settings.

For development, use configurable pilot allowances of one successful free analysis and ten Pro analyses per UTC calendar month. These are test defaults, not verified launch economics. Enforce one concurrent analysis/user and a separate bounded daily attempt cap. Record the configured model, tokens, actual cost if returned or a clearly labeled estimate. Reuse the configured application model client only after adding bounded analysis-specific handling; do not inherit the old text helper's broad retries/token escalation. Grok worker configuration is independent of the model used inside the product. Final public quotas require a measured cost/quality check before release.

Retain referral thresholds, qualification rules, attribution, and existing rewards for this release. Restyle invite sharing/progress and clarify qualifying activity. Posting, publishing a project, and copying a portfolio link must not silently grant or inflate referral rewards.

Collect aggregate public view/click counts with bounded same-session deduplication and abuse limits. Ignore owner previews, bots where detectable, drafts, and private sections. Use existing consent preferences; avoid storing raw IPs, private messages, or raw source code in analytics. Project click tracking accepts a validated project ID and resolves its saved destination server-side, never an arbitrary redirect URL.

Remove weekly-match/Eve/jobs-ingest schedules from `vercel.json`; retain unread-message notifications/digests. Inventory any matching database cron jobs and remove only the named retired schedules through reviewed migrations. Jobs routes return a clear unavailable state and reject side-effecting actions; club/Eve endpoints are disabled as well as their UI. Preserve club/job historical data in this release. Refresh pricing, landing, onboarding prompts, help copy, search, and navigation so retired features are no longer advertised.

New server configuration: GitHub OAuth client ID/secret and callback URL, a versioned token-encryption key, analysis enable/model/limit settings, and a bounded GitHub-sync batch limit. Document names/placeholders in `.env.example`. Existing local `.env.local` is a working-app connection, not proof that its database is a disposable test target. Prepare code/migrations locally; live schema changes and real billing/email operations require a verified target and appropriate authorization.

## 8. Acceptance and worker handoff

Use [SAMEHERE_WORKSTREAMS.md](SAMEHERE_WORKSTREAMS.md) for file ownership, dependencies, review boundaries, and completion evidence. The primary assistant reviews every stage and every correction. Workers run implementation checks; they do not act as independent planners/reviewers or spawn other workers.

Required evidence:

- Login/signup/recovery redirects and referral attribution still work; feed labels/tags are optional and removable; existing messages/reactions/comments/reposts retain their behavior.
- Database tests cover owner/other-user/anonymous, unpublished/private/blocked/suspended, credential isolation, atomic quota races, disconnect during processing, and late-worker writes.
- Search returns only visible records with deterministic ordering and no model calls. Contributions preserve source metrics/dates and stale states.
- Analysis tests cover repeat clicks, same-SHA reuse, empty/large/malicious repositories, provider failure/invalid output, interrupted processing, refresh, retries, quota limits, role confirmation, and separate draft publication.
- A test-mode end-to-end path covers connect/select → analysis → edit → publish → logged-out portfolio → optional feed post → comment/reaction → DM. Verify existing Pro/referral grants, failed payments/expiry handling, and no paid model calls during public reads.
- Browser verification at desktop/mobile widths covers the ported landing, feed, DMs, profile editor/public view, analysis progress/error states, light preference, keyboard focus, and reduced motion. Run repository lint, typecheck, meaningful tests, and build/OG checks. Log pre-existing failures distinctly.

Application changes, migrations, and public rollout are separate milestones. The current baseline server at `http://localhost:3000` is already running; the new product is not implemented yet.
