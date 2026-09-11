---
name: verify-samehere
description: Drive the samehere Next.js web app (landing, signup, login, pricing, public profiles) in a real Chrome session the way a user does. Use when proving UI behavior, checking a local instance, or capturing verification evidence.
---

# Verify samehere

samehere is a Next.js 16 App Router web app (`npm run dev`, default product port 3000). There is no Playwright/Cypress suite and no CLI surface. Verification launches an isolated `next dev` on **127.0.0.1:4173**, then drives Chrome through `control-samehere browser` (Playwright-core over CDP against system `google-chrome`).

Read [features/README.md](features/README.md) before driving. The map is the source of truth; proving one convenient entry point is incomplete when a feature file lists others.

Signed-in product surfaces (`/feed`, `/search`, `/messages`, `/settings`, `/jobs`, `/community`, `/dashboard`) require a real Supabase session. This skill does not mint accounts. If `doctor` reports `env_mode=scaffolded`, treat those routes as unreachable (they 307 to `/signup`).

## Launch

One verification instance per checkout. `next dev` writes `.next/` in the repo; a second Next process on the same worktree will corrupt the session. `launch` refuses if port 4173 is taken or if another `next` is already running from this repo.

```bash
# From the repo root. Install helper deps once per machine.
npm install --prefix .cursor/skills/verify-samehere/helpers --omit=dev --no-fund --no-audit

.cursor/skills/verify-samehere/helpers/control-samehere launch
# optional: --port 4173 --host 127.0.0.1
```

Ready when `launch` prints `ok url=http://127.0.0.1:4173` and `GET /` returns HTML containing `samehere`. The helper polls for up to 90s (first compile downloads `next/font` Google faces).

What launch does:

- Starts `npm run dev -- --hostname 127.0.0.1 --port 4173` in its own process group.
- Sets `SAMEHERE_VERIFY=1`, `SAMEHERE_VERIFY_RUN_ID`, `PORT`, `HOSTNAME`.
- If `.env.local` exists, Next loads it (`env_mode=repo`). Do not overwrite it.
- If `.env.local` is missing, launch exports a **verification-scaffolding** Supabase URL/anon JWT and `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4173` (`env_mode=scaffolded`). Those values live only in the process environment and `.run/`; they are not written into the repo. Landing, login/signup forms, pricing, and legal pages still render. Auth mutations and live profile RPCs do not.
- Unsets `INVITE_ONLY` in the scaffolded case so OAuth buttons stay visible. A repo `.env.local` with `INVITE_ONLY=1` hides them (`invite_only=yes`).

State: `.cursor/skills/verify-samehere/.run/` (pid, port, run id, next.log, chrome profile). Gitignored.

Teardown is `control-samehere cleanup` (see Cleanup). Never `pkill -f next`.

## Doctor

Read-only. Run before the first drive, after any failed drive, and whenever the instance looks off.

```bash
.cursor/skills/verify-samehere/helpers/control-samehere doctor
```

Pass means all of:

- `.run/pid` is alive.
- Port `4173` (or the launched port) is owned by that process group.
- `GET /` is `200` and the body contains `samehere`.
- Printed `url`, `run_id`, `env_mode`, `invite_only`, `landing=yes|no`, and `<title>`.

Fail → fix or `cleanup` + `launch`. Do not drive an instance this run did not start.

`env_mode=scaffolded` prints a note: skip live signup/login success and published-profile proofs.

## Drive

Harness is `control-samehere`. Browser actions use Playwright `getByRole` against a **1280×800** desktop viewport (landing `Log in` / `Join free` are `hidden md:inline-flex`; a mobile width hides them).

```bash
BIN=.cursor/skills/verify-samehere/helpers/control-samehere

$BIN browser goto --path /
$BIN browser click --role link --name "Join free" --nth 0
$BIN browser fill --role textbox --name "Email" --value "you@school.edu"
$BIN browser press --key Enter --role textbox --name "Email"
$BIN browser wait --text "Create your account"
$BIN browser snapshot --aria --path artifacts/landing/signup.aria.txt
$BIN browser screenshot --path artifacts/landing/signup.png
$BIN browser url
$BIN http get --path /feed --expect-status 307
```

Stable handles from this repo (prefer these over CSS or coordinates):

| Surface | Handle |
|---|---|
| Brand | `link` name `samehere home` |
| Landing desktop nav | `link` `Log in`, `link` `Join free` (nth 0 is the header). Section links `Product`, `Community`, `Pricing` inside `navigation` `Page sections`. |
| Landing hero | heading text includes `Find your people` / `Show what you’re building.`; primary CTA `Join free`; secondary `Explore the community` (`#community`). |
| Community demo | `tablist` `Product areas` with tabs `Feed`, `Messages`, `Portfolio`. `#community` is this block, not the later invite band. |
| Pricing block | `#pricing`, heading `Share your work. Make your portfolio your own.`, articles `Share work and find peers` / `More room to present your work`, `Join free`, `View Pro`. |
| Footer | `navigation` `Footer`: `Pricing`, `Terms`, `Privacy`, `Sign up`. |
| Signup | heading `Create your account`; textboxes `Email`, `Username`, `Password`, `Referral code` (or `Invite code` when `invite_only=yes`); buttons `Create account`, `Continue with Google`, `Continue with GitHub`; link `Log in`. |
| Login | heading `Log in`; textboxes `Email`, `Password`; button `Log in`; links `Forgot password?`, `Create an account`. |
| Login errors | `alert` `Enter your email and password.` (empty submit if the browser allows it) or `Invalid email or password.` |
| Signup errors | `alert` with `Username must be 3-20 characters…`, `That username is reserved.`, `Password must be at least 8 characters.` |
| Pricing page | `/pricing`, heading same as the landing block, header `Join free`. |
| Missing profile | `/profile/<unknown>` → `Profile not found`. |

`--nth` is 0-based among matches. Duplicate names (`Join free`, `Log in`) are everywhere; the feature file says which nth.

Do not click `Continue with Google` / `Continue with GitHub` — those hit real IdPs. Do not submit a successful signup against a live `.env.local`.

Anon `/feed` (and any other gated path) is `307` to `/signup`. Confirm with `http get`, not by treating the signup HTML as the feed.

## Evidence

Write under `.cursor/skills/verify-samehere/artifacts/<feature-id>/`. Relative `artifacts/...` paths given to `browser snapshot` / `screenshot` resolve there. Cleanup must not touch this tree.

Proof standards:

- Drive the real user path (click the same links a person uses). Do not call server actions, RPCs, or test-only URLs to fake a state.
- Capture the **action** and the **resulting state** (ARIA snapshot + screenshot). A final screen alone is not enough.
- UI proof must show samehere identity: the `samehere home` brand and the page heading.
- HTTP side effects: record status + `Location` for redirects (`http get`).
- Auth: HTML5 `required` may block an empty submit; that is a real user-visible outcome — snapshot the still-on-page form, do not invent an `alert`.
- Mocks: the scaffolded Supabase URL is a launch fallback so middleware can construct a client. It is not a stand-in for a successful login, signup, or published profile. Observe what it actually skips (`env_mode=scaffolded`, failed RPCs → `Profile not found`, login `alert` `Invalid email or password.` or a generic create-account failure).
- Record feature ID, entry point, URL, and `run_id` in `artifacts/<feature-id>/run.json`.

## Cleanup

```bash
.cursor/skills/verify-samehere/helpers/control-samehere cleanup
```

Kills the exact Next.js process group recorded at launch and the Chrome PID in `.run/chrome_pid`. Deletes `.run/` (logs, chrome profile, pid files). Leaves `artifacts/` in place.

Run cleanup after every failed iteration too, then launch again. If launch itself fails mid-start, it already calls cleanup.

Never `pkill -f next`, `pkill -f chrome`, or kill by window title.

## Helpers

All invocations assume the repo root. `control-samehere` is executable.

```bash
chmod +x .cursor/skills/verify-samehere/helpers/control-samehere   # once, if git dropped +x

.cursor/skills/verify-samehere/helpers/control-samehere launch
.cursor/skills/verify-samehere/helpers/control-samehere doctor
.cursor/skills/verify-samehere/helpers/control-samehere browser goto --path /
.cursor/skills/verify-samehere/helpers/control-samehere cleanup
```

`helpers/lib/browser.mjs` is the CDP driver. `helpers/package.json` pins `playwright-core` only (system Chrome, no browser download). The first `browser` command runs `npm install` in `helpers/` if `node_modules` is missing.

Optional env:

- `SAMEHERE_VERIFY_PORT` / `--port` — default `4173`
- `SAMEHERE_VERIFY_HOST` / `--host` — default `127.0.0.1`
- `SAMEHERE_VERIFY_STATE_DIR` — default `<skill>/.run`
- `SAMEHERE_VERIFY_ARTIFACTS_DIR` — default `<skill>/artifacts`
- `SAMEHERE_VERIFY_CHROME` — Chrome binary
- `SAMEHERE_VERIFY_PROFILE_USERNAME` — live username for the published-profile path

Keep the map honest with `/maintain-verification-skill` as the app changes.
