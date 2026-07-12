# samehere

samehere is a verified-student social platform for students who want real peer connections instead of recruiter noise. It uses `.edu` email verification as the access gate and Claude to power AI-driven peer matching from student profiles.

**Status: v1 shipped and live**, with Pro billing wired. Core platform, AI features, trust & safety, moderation, and Stripe billing are all in production.

**Live on Vercel** — every push to `main` auto-redeploys.

## The problem

Students don't have a dedicated space that combines verified peer identity, real community, and meaningful connection. LinkedIn is built for professionals, not students still learning. Discord servers are unstructured and easy to get lost in. samehere is built around student identity as the foundation, so the people you connect with are genuinely your peers.

## What's built

### Authentication and access
- `.edu` email verification enforced **in the database**, by the `handle_new_user` trigger on `auth.users`, so a signup with a non-`.edu` address aborts the transaction. The check in the signup Server Action is UX only — the anon key is public, so any control that lives only in app code can be skipped by talking to Supabase directly. Out-of-band accounts (a dashboard invite) are exempted through a definer-only `signup_allowlist` table, not an env var
- Supabase Auth: sign up, sign in, email confirmation, password reset (forgot / update)
- Logged-out visitors reach the landing, auth routes, `/profile/[username]`, and `/post/[id]` — nothing else. Profiles show identity, school, year, major, bio, goals, counts and the heatmap, never posts; a single post shows its content, author and reaction counts, never comments or media. Private accounts expose identity and counts only. Both surfaces are served by `SECURITY DEFINER` functions that return one row for one id; the `posts` SELECT policy still requires `auth.uid() is not null`, so the anon key cannot enumerate the corpus. Both carry `robots: noindex` — link previews do not consult it
- Suspension is a read gate as well as a write gate: a suspended account is redirected out of every content route and cannot record a profile view

### Student profiles
- Username, display name, school, year, major, bio, skills, goals, courses
- Public profile at `/profile/[username]`, editable at `/profile/edit`
- Avatar upload via Supabase Storage
- Privacy: private accounts (follow approval), hideable school (separate RLS-gated table), per-profile heatmap visibility
- Profile hover-previews across the app

### App shell & navigation
- Persistent left nav rail on desktop (Home, Notifications, Messages, Community, Saved, Profile, Pro) with live unread badges; a fixed bottom tab bar on mobile — one shell across every signed-in page, page content centered in the viewport (a reserved scrollbar gutter keeps it from shifting between short and long pages)
- The signed-in feed is a three-column layout: the timeline centered between the left nav and a right rail — your profile + contribution heatmap, trending, suggested peers, people from your school, the weekly leaderboard (with your own rank pinned on top), and an invite CTA. Search lives in the top bar

### Social feed
- Latest + Following tabs, chronological, cursor pagination with infinite scroll and a "N new posts" pill
- Composer collapsed behind a trigger (expands and focuses inline); image/video upload (private bucket, signed URLs), live point counter, and @mention autocomplete
- Reactions: Like, SameHere, Repost, Bookmark
- Comments, quote-reposts and plain reposts (surfaced on the reposter's profile) with engagement counts, individual post pages
- Pending follow requests and onboarding checklist surface inline; "Looking for teammate" post type
- Report button and post menus

### Follow system
- Follow / unfollow, private-account request → accept flow
- Follower / following counts (lists stay private), follow-request inbox
- Blocking (removes follows both ways, hides content)

### Direct messaging
- One-to-one DMs with inbox, threads, unread counts, start-by-username
- **Realtime** — new messages update the open thread and the inbox live

### Notifications
- In-app notifications (follow, follow request, comment, reaction) written by DB triggers
- Navbar bell with unread count, **realtime** (live increment on new, decrement when an action is undone)
- Point + notification integrity: undoing a qualifying action same-day revokes its heatmap point and clears an unread notification

### Contribution heatmap, streaks & leaderboard

A GitHub-style activity heatmap on every profile showing daily engagement, tracked in tiers with quality gates to prevent low-effort gaming.

| Action | Minimum requirement | Points |
|---|---|---|
| Profile update | Meaningful field updated (bio, skills — not avatar) | 1 |
| Connection accepted | Mutual acceptance by both users | 2 |
| Comment | 50+ characters | 3 |
| Post published | 150+ characters | 5 |

Each action type counts once per day. Daily square intensity reflects total points. Profile updates have a weekly cooldown. All scoring is enforced server-side in `SECURITY DEFINER` functions — points are never trusted from the client. Day boundaries use midnight America/New_York.

- **Streaks**: consecutive days with activity, plus a saver nudge when today has no point yet
- **Leaderboard**: global and per-school boards ranked by weekly points (schools canonicalized server-side so "UF" and "University of Florida" don't split)
- **Shareable OG card** with the heatmap for each profile

### AI features (Claude via the `openai` SDK)
- Peer matching: suggested users ranked by profile-signal overlap (school, year, major, goals, bio), recency fallback on thin data
- Connection prompts: one AI sentence per suggested-follow card explaining the fit (cached)
- Natural-language people search ("cs juniors at UF who know rust") — parsed server-side into structured filters
- Composer writing prompts, weekly prompt + weekly recap, profile-completion nudges
- "Improve my post" and DM icebreaker drafts (Pro)
- Tiered models: free users get a fast model, Pro users get a stronger one; metered per user with a cap-hit upsell
- All calls server-side; the provider/model is swappable by env with no code change; AI output is rendered as plain text only

### Trust, safety & moderation
- Reports, blocks, feedback, account settings, delete-account (edge function for the auth-user purge)
- Coarse per-user rate limits on posts/follows
- **Admin moderation** (`/admin`, gated to admins): triage open reports, soft-hide posts, suspend/unsuspend users — all via `is_admin`-gated `SECURITY DEFINER` functions; privileged columns are frozen against self-grant

### Pro tier & billing
- Live perks: Pro badge, accent color, profile banner, who-viewed-you, animated avatar, and a stronger AI model with a 150/day cap per feature (a human cannot reach it; a script can). Every cosmetic is server-gated on `is_pro_now(is_pro, pro_until)` — one rule, used by the app, the privileged-column trigger, and the avatar RPCs, so the flag and the expiry cannot disagree — and frozen against direct writes by a trigger
- Stripe billing: hosted Checkout, Customer Portal, and one signature-verified webhook that sets `is_pro` / `pro_until`. Checkout identity is bound server-side (no payment links), and the Stripe customer id is unique per profile
- Pricing: **$4.99/mo · $12.99/semester**. Monthly is a subscription; semester is a one-time charge for a 6-month term, expired by a `pg_cron` job with a grace day so a late renewal webhook can't revoke a paying subscriber
- Promo codes are supported, including 100%-off checkouts that skip card entry and still grant Pro
- `NEXT_PUBLIC_BILLING_ENABLED` flips the `/pro` page between waitlist and live Checkout; pricing also has its own `/pricing` page
- The mission (peer discovery / connecting) is never paywalled
- Referrals: each user gets a referral link/code, tracks progress to 100, and earns a Social Butterfly badge. The first 100 signups platform-wide get the Founder badge (live "spots left" counter on the landing and signup pages)

### Onboarding & growth
- Dismissable onboarding checklist (avatar, bio, first post, first follow)
- Empty-feed AI suggestions, positioning copy ("verified students only")

### Landing & legal
- Full landing page (light + dark) with live product demos, pricing, FAQ, OG image
- Real Terms and Privacy pages

### Analytics
- Vercel Analytics + Speed Insights (traffic, Web Vitals) and PostHog (product funnels, error capture)

## What's not built yet
- Weekly "people to meet" email digest
- PWA + web push (DB scaffold only — `push_subscriptions` table exists; no manifest, service worker, or web-push dependency yet)
- Job board
- Inline natural-language people-search on the redesigned feed — the AI search action still exists, but its on-feed UI is being re-wired for the new three-column layout

## Tech stack

**Client** — Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS (light cream + dark themes)

**Backend & data** — Supabase (Postgres, Auth, Row Level Security, Storage, Realtime, edge functions)

**AI** — Claude via the `openai` SDK against a Claude-compatible endpoint (provider swappable by env)

**Billing** — Stripe (Checkout, Customer Portal, webhooks)

**Hosting & analytics** — Vercel, Vercel Analytics, PostHog

## Running it & what's not in this repo

samehere needs environment variables that are **never committed**. Copy `.env.example` to `.env.local` and fill in your own values, then `npm install && npm run dev`.

**Required environment:**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project (public by design; security rests on RLS, not secrecy)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never in app or client code. Three call sites: the Stripe webhook, the delete-account edge function, and `lib/weekly-prompt.ts` (which upserts a cache table holding no user data, behind an `auth.getUser()` check). Every other privileged read goes through a `SECURITY DEFINER` function keyed on `auth.uid()`
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_MODEL_PRO` — AI provider (OpenAI-compatible endpoint)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_SEMESTER` — billing
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` — analytics
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BILLING_ENABLED` — app config

> `SIGNUP_ALLOWLIST` is gone. It was a process env, and a Postgres trigger cannot read one — so the app and the database disagreed about who could sign up. Exemptions now live in the definer-only `public.signup_allowlist` table, seeded from the SQL editor.

**Intentionally excluded from the repo:**
- `.env*` (all secrets; only `.env.example` with blank names is committed)
- Internal working docs (agent, design-system, and strategy notes) — not required to run the app

The database schema and RLS policies live in `supabase/migrations/` and are public on purpose — the security model is enforced by Row Level Security and `SECURITY DEFINER` functions, not by hiding the schema.

`supabase/tests/rls_test.sql` is the regression suite for that model: 25 assertions covering the `.edu` gate, private-account visibility, blocks in both directions, contribution-point integrity, the report/evidence flow, suspension, and the anonymous public surface. It seeds fixtures, impersonates `authenticated` and `anon` the way PostgREST does, and rolls the whole thing back. Rejection assertions pin the expected `SQLSTATE`, so a fix cannot pass for the wrong reason — an insert blocked by a rate limiter is not an insert blocked by a policy.

```
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```

Two rules the schema is built on, both learned the hard way:

**A policy subquery runs as the caller.** `comments` mirroring `posts` visibility works *because* `posts` RLS filters the subquery to what the caller may see. The same mechanism silently broke blocks: `blocks` has an owner-read policy, so `not exists (select 1 from blocks ...)` only ever saw rows the *caller* wrote, and "someone blocked me" matched nothing. Block checks go through `get_blocked_ids()`, a definer, for exactly this reason. Column grants apply to those subqueries too.

**A `SECURITY DEFINER` bypasses RLS, so every predicate it skips must be rewritten by hand.** `get_public_post` re-checks that the post exists, the author is not private, and the post is not hidden — and returns zero rows for all three, so they are indistinguishable to a caller. Adding a field to a public RPC is a new public disclosure.

## Why this project

A personal portfolio project built to develop full-stack skills with a real product behind it, not a tutorial clone. The problem it solves is one I've run into directly as a self-taught, non-traditional CS student looking for peers at a similar stage.

## Author

Dev Goswami

- Portfolio: https://builtbyd3v.com
- LinkedIn: https://linkedin.com/in/builtbydev
