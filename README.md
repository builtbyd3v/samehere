# samehere

samehere is a verified student social platform for students who want real peer connections instead of recruiter noise. It uses .edu email verification as the access gate and Claude to power AI-driven peer matching based on student profiles.

**Status: v1 shipped and live.** Core platform, AI features, trust & safety, and Pro presence are all in production. Stripe billing is the next milestone (payment deferred to v1.1).

**Live on Vercel** — every push to `main` auto-redeploys.

## The problem

Students don't have a dedicated space that combines verified peer identity, real community, and meaningful connection. LinkedIn is built for professionals, not students still learning. Discord servers are unstructured and easy to get lost in. samehere is built around student identity as the foundation, so the people you connect with are genuinely your peers.

## What's built

### Authentication and access
- .edu email verification enforced server-side before the account is created
- Supabase Auth: sign up, sign in, email confirmation, password reset (forgot / update)
- Twitter-style gate: logged-out users reach only the landing, login, signup, and auth routes — everything else redirects to signup, enforced in both middleware (`proxy.ts`) and Row Level Security

### Student profiles
- Username, display name, school, year, major, bio, skills, goals
- Public profile at `/profile/[username]`, editable at `/profile/edit`
- Avatar upload via Supabase Storage
- Privacy: private accounts (follow approval), hideable school, per-profile heatmap visibility
- Profile hover-previews across the app

### Social feed
- Latest + Following tabs, chronological, cursor pagination
- Composer with image/video upload (private bucket, signed URLs) and @mention autocomplete
- Reactions: Like, SameHere, Repost, Bookmark
- Comments, quote-reposts with engagement counts, individual post pages
- Report button and post menus

### Follow system
- Follow / unfollow, private-account request → accept flow
- Follower / following counts (lists stay private), follow-request inbox
- Blocking (removes follows both ways, hides content)

### Direct messaging
- One-to-one DMs with inbox, threads, unread counts, start-by-username

### Notifications
- In-app notifications (follow, follow request, comment, reaction) written by DB triggers
- Navbar bell with unread count (no realtime — fetch on load)

### Contribution heatmap

A GitHub-style activity heatmap on every profile showing daily engagement, tracked in tiers with quality gates to prevent low-effort gaming.

| Action | Minimum requirement | Points |
|---|---|---|
| Profile update | Meaningful field updated (bio, skills — not avatar) | 1 |
| Connection accepted | Mutual acceptance by both users | 2 |
| Comment | 50+ characters | 3 |
| Post published | 150+ characters | 5 |

Each action type counts once per day. Daily square intensity reflects total points. Profile updates have a weekly cooldown. All scoring is enforced server-side in a `SECURITY DEFINER` function — points are never trusted from the client.

### AI features
- Peer matching: suggested users ranked by profile-signal overlap (school, year, major, skills, goals), recency fallback on thin data
- Connection prompts: one AI sentence per suggested-follow card explaining the fit
- Composer writing prompts + profile-completion nudges
- All calls server-side via the `openai` SDK pointed at a Claude-compatible endpoint; metered per user

### Trust & safety
- Reports, blocks, feedback, account settings, delete-account (edge function for the auth-user purge)

### Pro tier (presence — billing deferred to v1.1)
- `is_pro` / founder flags, `/pro` page, waitlist
- Live perks: Pro badge, accent color, who-viewed-you
- Pricing: $4.99/mo · $19.99/yr (Stripe Checkout + webhook land in v1.1)

### Landing & legal
- Full landing page (light + dark) with live product demos, pricing, FAQ, OG image
- Terms and privacy pages

## What's not done yet
- Stripe billing (Checkout, Customer Portal, webhook)
- Server-side animated-avatar gate for Pro
- AI icebreakers, "Improve my post"
- Realtime notifications, email notifications
- Job board

## Tech stack

### Client
- Next.js 16 (App Router), React 19
- TypeScript (strict)
- Tailwind CSS (light cream + dark themes)

### Backend and data
- Supabase (Postgres, Auth, Row Level Security, Storage, edge functions)

### AI
- Claude via the `openai` SDK against a Claude-compatible endpoint (provider swappable by env)

### Hosting
- Vercel

## Why this project

This is a personal portfolio project built to develop full-stack skills with a real product behind it, not a tutorial clone. The problem it solves is one I've run into directly as a self-taught, non-traditional CS student looking for peers at a similar stage.

## Author

Dev Goswami

- Portfolio: https://builtbyd3v.com
- LinkedIn: https://linkedin.com/in/builtbydev
