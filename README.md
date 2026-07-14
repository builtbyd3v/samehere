# samehere

samehere is a student network for people who want real peer connections instead of recruiter noise. Anyone can sign up; a `.edu` email earns a **Verified Student** badge, and Claude powers AI peer matching, natural-language people search, and a jobs layer built from student profiles.

**Status: v1 shipped and live, in invite-only beta** (`INVITE_ONLY=1` gates signup behind a member's invite code; beta accounts are granted Pro for the duration). Core platform, AI features, jobs board, clubs, trust & safety, moderation, and Stripe billing are all in production.

**Live on Vercel** — every push to `main` auto-redeploys.

## The problem

Students don't have a dedicated space that combines verified peer identity, real community, and meaningful connection. LinkedIn is built for professionals, not students still learning. Discord servers are unstructured and easy to get lost in. samehere is built around student identity as the foundation, so the people you connect with are genuinely your peers.

## What's built

### Authentication and access
- Open signup (email or OAuth) — the `.edu` gate was retired in favor of an earned **Verified Student** badge, set in the database by the `handle_new_user` trigger from the confirmed email domain and frozen against client writes. During the invite-only beta, `INVITE_ONLY=1` additionally requires a valid member invite code, validated pre-auth by a boolean-only `SECURITY DEFINER` function so codes can't be enumerated
- Supabase Auth: sign up, sign in, email confirmation, password reset (forgot / update)
- Logged-out visitors reach the landing, auth routes, `/profile/[username]`, and `/post/[id]` — nothing else. Profiles show identity, school, year, major, bio, goals, counts and the heatmap, never posts; a single post shows its content, author and reaction counts, never comments or media. Private accounts expose identity and counts only. Both surfaces are served by `SECURITY DEFINER` functions that return one row for one id; the `posts` SELECT policy still requires `auth.uid() is not null`, so the anon key cannot enumerate the corpus. Both carry `robots: noindex` — link previews do not consult it
- Suspension is a read gate as well as a write gate: a suspended account is redirected out of every content route and cannot record a profile view

### Student profiles
- Username, display name, bio, goals, plus structured **experience** entries (internships, jobs, research, club roles) and **education** entries with date ranges; the current education entry back-fills `major` and school so match signals never go stale
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
- Reactions: SameHere, Repost, Bookmark (Like was retired — one resonance reaction, named for the product)
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
| Post published | 150+ characters | 4 (6 at 600+) |
| Post with media | Qualifying post carrying an image/video | +1 |
| Comment | 50+ characters, not on your own post | 3 (4 at 250+) |
| Quote repost | 50+ characters of quote text | 3 |
| Profile update | Meaningful field updated (bio, goals — not avatar) | 1 |
| Referral converted | Your referee publishes their first qualifying post | 3 |

Each action type counts once per day. Daily square intensity reflects total points. Profile updates have a weekly cooldown; referral credit is once ever per referee. All scoring is enforced server-side in `SECURITY DEFINER` triggers with matching same-day revocation on delete — points are never trusted from the client. Day boundaries use midnight America/New_York.

- **Streaks**: consecutive days with activity, plus a saver nudge when today has no point yet
- **Leaderboard**: global and per-school boards ranked by weekly points (schools canonicalized server-side so "UF" and "University of Florida" don't split)
- **Shareable OG card** with the heatmap for each profile

### AI features (Claude via the `openai` SDK)
- Peer matching: suggested users ranked by profile-signal overlap (school, major, goals, bio), recency fallback on thin data
- Connection prompts: one AI sentence per suggested-follow card explaining the fit (cached)
- Natural-language people search ("cs juniors who interned somewhere and know rust") — SQL prefilter, then LLM re-rank over profiles, experience entries, and expected grad year, one grounded reason per result
- Jobs AI: rank the board against your profile ("find my matches") and a Pro pitch generator that tailors resume bullets to one listing (both cached)
- Composer writing prompts, profile-completion nudges, AI bio/goals drafting
- "Improve my post" (Pro) and DM icebreaker drafts
- Tiered models: free users get a fast model, Pro users get a stronger one; metered per user with a cap-hit upsell
- All calls server-side; the provider/model is swappable by env with no code change; AI output is rendered as plain text only

### Community: clubs & jobs
- **Clubs** (`/community`): open directory with tags and avatars, per-club channels with realtime chat, roles (owner/officer/member), announcements, bans, and per-creator rate limits. An optional AI host bot ("Eve") can welcome new members and post discussion prompts in clubs where it holds an officer role — RLS-bound to its own session, never awarded contribution points
- **Jobs board** (`/jobs`): listings ingested and enriched by a daily cron, with detail pages, saves, AI fit-ranking against your profile, and a Pro pitch generator

### Emails
- Resend transactional email on a shared branded layout: welcome, daily unread digest, and a weekly "people to meet" matches email — all with HMAC-signed one-click unsubscribe

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
- First-run onboarding wizard: profile basics, education, then AI-matched people to follow before landing on the feed
- Empty-feed AI suggestions; referral links with a joined-notification when your invite converts

### Landing & legal
- Full landing page (light + dark) with live product demos, pricing, FAQ, OG image
- Real Terms and Privacy pages

### Analytics
- Vercel Analytics + Speed Insights (traffic, Web Vitals) and PostHog (product funnels, error capture)

## What's not built yet
- Web push / PWA (deliberately dropped after a scaffold spike — realtime covers open tabs; revisit post-launch)
- Native mobile app
- Experience/education entries feeding the suggested-peers scorer (they already feed AI people search) and earning heatmap points

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
