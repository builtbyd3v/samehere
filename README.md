# samehere

samehere is an **AI internship coach** that redesigns itself around each student — solo-first, struggle-aware, with a thin opt-in layer so people who logged real company experience can be asked for help.

**Status:** pivoting from student social network → zero-to-internship path product. Core stack (Next.js, Supabase, Claude, Stripe) unchanged. Invite-only beta may still gate signup (`INVITE_ONLY=1`).

**Live on Vercel** — every push to `main` auto-redeploys.

Product bible for the pivot: [`ZERO_TO_INTERNSHIP_RESTRUCTURE.md`](./ZERO_TO_INTERNSHIP_RESTRUCTURE.md).

## The problem

Cold-start students don’t need another empty feed. They need a path from zero experience to a real internship: what to build, where to apply, how to prep, and who (optionally) can help at a target company. Social density is not the spine.

## What’s shipping (path v1)

### Adaptive path home
- Struggle-aware intake → AI diagnosis → per-user **UI recipe** (`studio` / `ops_desk` / `prep_room` / `focus_track` / `network_gap`)
- Signed-in home at `/home` renders the matching recipe (compositional layouts, not generative HTML)
- Re-diagnosis when applications move to OA/interview, or via manual “Something changed”

### Build · apply · prep
- **Native projects** (`/projects/[slug]`) with in-app checklists persisted to `user_projects` — not outbound tutorial links
- **Skill-stage substrate** (ordered stages + why-it-matters + apply-early checkpoints) feeding recipes — no roadmap mall
- **Opportunities** (`/jobs`) with fit ranking + Pro pitch; path home embeds a shortlist
- **Applications** tracker (`/applications`) with status pipeline
- **Company interview banks** (`/prep`, `/prep/[company]`) with approach / evaluating + AI written feedback (metered)

### Thin multiplayer
- Opt-in **company helpers**: experience at org + `profiles.open_to_help` → appear on listing → 1:1 DM ask
- Helpers never gate the solo path

### Nav (primary)
Home · Opportunities · Applications · Messages · Profile · Pro  
Feed / community / saved / leaderboard redirect to `/home` (deprecated from primary UX).

### Monetization
- Free: diagnosis, recipe home, core tasks, browse jobs, basic tracker, limited AI
- Pro: velocity — re-diagnosis, pitches, interview feedback packs, higher caps  
Never paywall the first diagnosis or “a path exists for you.”

### Auth, dossier, trust
- Supabase Auth; Verified Student badge from `.edu` (invite-only may still apply)
- Profiles + education + experiences as the internship dossier
- Reports, blocks, admin moderation, settings retained

## What’s deprecated (primary product)

Feed, clubs/Eve, heatmap/leaderboard as core loops, follow-driven people search, social onboarding (follow/post steps). Schema may linger; primary nav and routes no longer sell them.

## Tech stack

**Client** — Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS  

**Backend & data** — Supabase (Postgres, Auth, RLS, Storage, Realtime)  

**AI** — Claude via the `openai` SDK (provider swappable by env)  

**Billing** — Stripe (Checkout, Customer Portal, webhooks)  

**Hosting & analytics** — Vercel, Vercel Analytics, PostHog  

## Running it

Copy `.env.example` to `.env.local`, then `npm install && npm run dev`.

**Required environment (see `.env.example`):**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, allowlisted call sites
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_MODEL_PRO`
- `STRIPE_*`, `NEXT_PUBLIC_BILLING_ENABLED`, `NEXT_PUBLIC_SITE_URL`
- PostHog tokens as needed

Schema and RLS live in `supabase/migrations/`. Path foundation: `20260812040000_path_foundation.sql`. Seed catalogs: `npx tsx scripts/seed-path-content.ts`.

```
npm test
npm run typecheck
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```

## Author

Dev Goswami

- Portfolio: https://builtbyd3v.com
- LinkedIn: https://linkedin.com/in/builtbydev
