# samehere

**Student networking for people at the same stage** — find peers who are building, learning, or stuck (especially online / no-campus students), then share a portfolio anyone can open without an account.

**Live:** [www.samehere.dev](https://www.samehere.dev) · invite-only beta when `INVITE_ONLY=1` · every push to `main` redeploys on Vercel.

> ShellHacks one-liner: *LinkedIn is for resumes. samehere is for “I’m a CS junior online and I need people who get it” — feed + shareable portfolio, stage-first discovery shipping next.*

## What’s live today

| Surface | What students get |
| --- | --- |
| Landing + auth | Dark brand, email/OAuth signup, lands on `/feed` |
| Feed | Latest / Following, composer, comments, **SameHere** reactions, reposts, saved |
| Post labels | Optional **Building / Learning / Stuck** (searchable; feed filter chips are in open PRs) |
| Profile tags | **Open to collaborate / Study together / Feedback** |
| Portfolio (**hard keep**) | `/profile/[username]` — logged-out readable; intro, projects, activity, experience; Share → absolute URL |
| Search | Deterministic text over people / projects / posts (no AI ranking) |
| DMs | 1:1 + groups; **Message** from profiles |
| Referrals, Pro, safety | Invite codes, Stripe Pro (env-gated), block / report / private accounts |

**Retired on purpose:** clubs / Eve, jobs board, AI peer matching, weekly match emails, leaderboards. Routes show honest empty states.

**Still dark / incomplete on prod:** GitHub connect + repo→project analysis, Pro aggregate analytics, digest email — need secrets; fail closed.

## Open review PRs (do not merge overnight)

Stage-based discovery and polish are review-ready on GitHub — leave open until human review:

| PR | Bet | What |
| --- | --- | --- |
| [#34](https://github.com/builtbyd3v/samehere/pull/34) + [#36](https://github.com/builtbyd3v/samehere/pull/36) | 1 — discovery | `study_mode`, search filters, browse people, stage-first suggestions |
| [#33](https://github.com/builtbyd3v/samehere/pull/33) | 2 — Stuck | Feed `?label=` filters + Following seed |
| [#37](https://github.com/builtbyd3v/samehere/pull/37) | 4B | Looking for team post label |
| [#38](https://github.com/builtbyd3v/samehere/pull/38) / [#39](https://github.com/builtbyd3v/samehere/pull/39) | speed / polish | Next.js budgets, empty states, a11y |

## Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** Supabase (Postgres, Auth, RLS, Storage, Realtime)
- **Hosting:** Vercel (+ Analytics / Speed Insights); optional PostHog
- **Billing:** Stripe (Checkout / Portal / webhooks)
- **AI (optional):** OpenAI-compatible SDK — only for flagged GitHub repo → portfolio draft; not used for matching

## Run locally

Node **≥ 24**. Secrets are never committed.

```bash
cp .env.example .env.local   # fill Supabase (+ optional Stripe / AI / GitHub)
npm install
npm run dev                  # http://localhost:3000
```

**Minimum to boot auth + feed against a Supabase project:**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000` — required for correct share links)

Optional: Stripe, PostHog, Resend, GitHub OAuth / analysis, `INVITE_ONLY=1`. See `.env.example`.

**Useful scripts:** `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`

Schema + RLS live in `supabase/migrations/`. Regression: `supabase/tests/rls_test.sql` (and portfolio harness under `supabase/tests/`).

## Hard keeps (do not regress)

- Shareable portfolio URL works logged out; Share uses an **absolute** `www.samehere.dev` link
- Logo intro animation (`components/brand/*`)
- No re-grant of `record_profile_view` (Pro named visitors stay revoked)
- Pro stays quiet (no fake upsell / subscriber noise)
- x.ai-inspired dark palette (no purple/glow drift)

## Author

Dev Goswami · [builtbyd3v.com](https://builtbyd3v.com) · [LinkedIn](https://linkedin.com/in/builtbydev)
