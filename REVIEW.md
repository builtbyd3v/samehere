# samehere — Security & Quality Audit

**Date:** 2026-07-09 · **Scope:** full codebase + `supabase/migrations/` + live policy/function definitions
**Method:** static read of app code and migrations, plus a read-only dump of live `pg_policies` / `pg_proc` to confirm which migration actually won. Where a migration and the live database disagree, the live definition is cited as authoritative.
**Constraint:** analysis only. Nothing in this document has been applied.

---

## Summary

The RLS-as-perimeter model is, in the main, well built. All 23 public tables have RLS enabled. Every `SECURITY DEFINER` function pins an explicit `search_path` (`""` or `pg_catalog`), which closes the classic escalation vector. Tables that must never be touched directly (`ai_usage`, `profile_views`, `dm_pairs`) have RLS on and *zero* policies, so they are reachable only through definer functions — that is correct-by-construction, not an oversight. `profiles` has no `email` column, so email genuinely cannot be selected by another user. There is no `dangerouslySetInnerHTML` anywhere. Service-role keys never reach the browser. Checkout identity is bound server-side and cross-checked in the webhook.

The failures are concentrated in a specific place: **things enforced in exactly one layer of TypeScript, where the database underneath does not repeat the check.** The `.edu` gate, the post-media privacy story, the contribution-point quality gates, and the block primitive each have precisely one gate, and in each case that gate is bypassable by talking to Supabase directly with the public anon key. The security model is described as resting on RLS; in these four cases it actually rests on the app being the only client.

Two findings are Critical, four are High.

---

## CRITICAL

### C1 — The `.edu` gate is bypassable entirely; anyone can create a verified-student account

**Severity: Critical** · Files: `app/(auth)/actions.ts:35`, `lib/utils/validation.ts`, `supabase/migrations/20260705160000_growth_wave_d_referrals_and_profile_guard.sql` (`handle_new_user`)

`isEduEmail()` itself is correct — it splits on the last `@`, rejects multiple `@`, rejects an empty local part, lowercases the domain, rejects leading/trailing/double dots, and anchors `/\.edu$/`. I tried to break the parser and could not.

The parser is not the problem. **Its only call site is a Server Action:**

```ts
// app/(auth)/actions.ts:35
if (!isEduEmail(email) && !isAllowlisted(email)) return { error: "Enter a valid .edu school email address." };
```

Nothing else enforces it. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design, and Supabase's `/auth/v1/signup` endpoint is reachable directly with it. A caller who runs `supabase.auth.signUp({ email: "me@gmail.com", password, options: { data: { username } } })` never touches `app/(auth)/actions.ts`. The `handle_new_user` trigger that creates the profile row inspects `new.raw_user_meta_data` for a username and a referral code and **never looks at `new.email`**. No Supabase Auth Hook exists in the repo (`supabase/functions/` contains only `delete-account`).

Once such an account confirms its email, it holds a normal session. Every RLS policy in the system authorizes on `auth.uid() IS NOT NULL`, never on email domain — so the impostor reads the full student directory (`profiles` select is `(select auth.uid()) is not null`), the global feed, and can DM, follow, and post.

**Why it matters beyond access:** "Verified students only. Zero bots, zero impostors" is the load-bearing claim on the landing page (`components/landing/StatsBar.tsx:7-10`) and the entire differentiation of the product. The gate is cosmetic against anyone who reads the network tab.

**Recommended fix (not applied):** enforce the domain where the account is actually created, not in one action. Either (a) a Supabase Auth Hook (`before-user-created`) that rejects non-`.edu` addresses, or (b) a check inside `handle_new_user` that raises on `new.email` failing the domain test — with the allowlist read from a server-side config table rather than an env var the trigger cannot see. Option (a) is preferable because it prevents the `auth.users` row from existing at all. Keep the Server Action check as UX. Additionally consider a `profiles.email_domain` column populated by the trigger, so RLS can assert on it if the product ever needs to.

---

### C2 — Every authenticated user can list and download all private post media

**Severity: Critical** · File: `supabase/migrations/20260703170000_post_media.sql:26-28`

```sql
create policy "post-media authed select"
  on storage.objects for select
  using ( bucket_id = 'post-media' and auth.role() = 'authenticated' );
```

The bucket is genuinely private (`public = false`, MIME allowlist, 100 MB cap — all correct), and `lib/media.ts` mints signed URLs with a 1-hour TTL only after the caller has already fetched the parent post through the RLS-bound session client. The design intent is documented in the migration itself:

> "SELECT = any authenticated session, so the viewer's server session can mint a signed URL. Privacy holds because post-RLS gates who ever receives the path; paths are unguessable and signed URLs are short-TTL."

**The premise is false.** `storage.objects` SELECT is exactly the permission that governs `storage.from('post-media').list()`. Any authenticated user can enumerate every object path in the bucket, then call `createSignedUrl()` on any of them — the signing operation checks the same SELECT policy, which passes. Path unguessability is irrelevant once paths are listable, and TTL is irrelevant when the attacker mints the URL themselves.

Result: media attached to private accounts' posts, to posts by users who have blocked you, and to admin-hidden posts is readable by any account. Given C1, "any account" means anyone.

**This exact bug class was already found and fixed for the `avatars` bucket** in `supabase/migrations/20260708174554_avatars_select_owner_scope.sql`, whose own comment reads: *"originally any authenticated user could `.list()` and enumerate every user's avatar path."* The lesson was not carried over to `post-media`, where it matters far more (avatars are public by design; post media is not).

**Recommended fix (not applied):** scope the `post-media` SELECT policy to the owner, `(storage.foldername(name))[1] = (select auth.uid())::text`, matching the INSERT policy that already exists at lines 30-35. Server-side signing then needs elevated rights, so move `createSignedUrls` behind a `SECURITY DEFINER` function (or a narrow service-role call) that takes a `post_id`, re-checks the caller may SELECT that post, and only then signs its media rows. That makes the visibility check a database fact rather than a convention that every future caller must remember.

---

## HIGH

### H1 — Contribution points can be fabricated; heatmap, streak, and leaderboard are forgeable

**Severity: High** · Files: `supabase/migrations/20260705130000_growth_wave_b_contribution.sql:5-28`, `supabase/migrations/20260708004722_revoke_anon_execute_rpc_explicit.sql:29`

`log_contribution` correctly derives points server-side from `action_type` and never reads a client-supplied `points`. But the quality gate reads a client-supplied field:

```sql
v_len int := coalesce((p_metadata ->> 'character_count')::int, 0);
...
if p_action_type = 'post'    and v_len < 150 then return; end if;
if p_action_type = 'comment' and v_len <  50 then return; end if;
```

`p_metadata` is a function argument, and `EXECUTE` on `log_contribution(text, jsonb)` is granted to `authenticated` (confirmed live; the later hardening migrations revoke it from `anon` only). So any logged-in user can call, straight from the browser:

```js
supabase.rpc('log_contribution', { p_action_type: 'post', p_metadata: { character_count: 999 } })
```

and be awarded 5 points with no post in existence. The unique index on `(user_id, date, action_type)` caps the yield at one row per action type per day — 5 + 3 + 2 + 1 = **11 points per day, fabricated, with zero content**. Repeat daily and the heatmap fills, `get_streak` reports an unbroken streak, and `get_leaderboard` (which sums `contribution_log` directly) ranks the attacker.

The reversal triggers added in `20260706140000_integrity_reversal.sql` do not help: `revoke_contribution_same_day` fires on deletion of a real post/comment and recounts qualifying rows. A fabricated point has no source row, so nothing ever fires to revoke it.

This directly negates design principle #2 in `PRODUCT.md` ("Show effort, don't claim it… surface real activity, never fake counts") and the landing claim "Effort made visible."

**Recommended fix (not applied):** stop trusting `p_metadata` for anything that gates a point. Either revoke `EXECUTE` from `authenticated` and call `log_contribution` only from `AFTER INSERT` triggers on `posts`/`comments` (which can read `char_length(NEW.content)` from the row itself), or change the signature to `log_contribution(p_action_type, p_source_id uuid)` and have the function look the row up and measure it. The trigger approach is strictly better: it also makes the `connection` and `profile_update` actions unforgeable, and it makes the revoke logic symmetric.

---

### H2 — A block can be defeated with one direct insert, restoring notification access

**Severity: High** · Live policy `follows` / `"user follows user"` (INSERT); `supabase/migrations/20260703233000_block_system.sql` (`request_follow`); `supabase/migrations/20260703250000_notifications_and_unread.sql:55-75` (`trg_notify_follow`)

`block_user()` does the right thing: it inserts the block and deletes follows in both directions. `request_follow()` also does the right thing — it refuses when a block exists in either direction.

But `request_follow` is a definer function the *app* chooses to call. The underlying INSERT policy on `follows` has no block clause at all:

```
with_check: (select auth.uid()) = follower_id
            AND (status = 'pending' OR NOT EXISTS(target is_private))
            AND NOT current_is_suspended()
```

A blocked user can bypass the RPC entirely and insert the row directly. The `follows_notify` trigger fires on INSERT regardless, delivering a `follow` or `follow_request` notification to the person who blocked them. Delete and re-insert to repeat; `rl_check_follows` throttles the rate but does not stop it.

The blocked user does **not** gain content access — the `posts` SELECT policy independently excludes blocked pairs in both directions, which is correct. The damage is that block, the primary anti-harassment primitive, does not stop the blocked party from appearing in the victim's follower graph and pushing notifications into their bell. For a platform about to onboard undergraduates, that is the wrong failure mode.

**Recommended fix (not applied):** add the same bidirectional `NOT EXISTS (select 1 from blocks …)` clause to the `follows` INSERT `with check` that `request_follow` already implements internally. The definer function then becomes a convenience wrapper rather than the sole enforcement point. Same principle as C1/C2: the policy, not the wrapper, must be the perimeter.

---

### H3 — Any past monthly subscriber who later buys a semester pass gets Pro forever

**Severity: High** · Files: `supabase/migrations/20260710170000_expire_lapsed_pro_skip_subscribers.sql` (uncommitted), `app/(app)/pro/actions.ts:107-112`

The semester plan is a one-time charge (`MODES = { monthly: "subscription", semester: "payment" }`, `pro/actions.ts:23`); nothing in Stripe revokes it, so a nightly `pg_cron` job does:

```sql
update public.profiles set is_pro = false
 where is_pro and pro_until is not null
   and stripe_customer_id is null            -- ← the skip
   and pro_until < now() - interval '1 day';
```

The `stripe_customer_id is null` predicate was added so the cron would not revoke Pro from a live monthly subscriber. It achieves that. It also means **the sweep permanently ignores anybody who has a `stripe_customer_id` for any reason.**

The webhook deliberately does not write `stripe_customer_id` on the semester (`mode: "payment"`) branch, so a semester-only buyer is expired correctly. But checkout reuses an existing customer when one is on file:

```ts
// app/(app)/pro/actions.ts:107-112
...(profile.stripe_customer_id ? { customer: profile.stripe_customer_id, ... } : { customer_email: user.email })
```

So the sequence — subscribe monthly (customer id is stored) → cancel (`subscription.deleted` sets `is_pro = false`, id remains) → later buy a $12.99 semester pass — produces a row with `is_pro = true`, a future `pro_until`, and a non-null `stripe_customer_id`. The cron skips it. `pro_until` elapses and nothing acts on it, because `isPro()` (`lib/pro.ts:4`) is `profile.is_pro === true` and never consults `pro_until`. Pro is permanent for a single one-time charge.

**Recommended fix (not applied):** the skip predicate is aimed at the wrong column. Distinguish *has an active Stripe subscription* from *has ever had a Stripe customer record* — add a `pro_source text` (`'subscription' | 'semester' | 'grant'`) or a `stripe_subscription_id` column, and skip only rows with a live subscription. Independently, make `isPro()` check `pro_until` (`is_pro && (pro_until is null || pro_until > now())`) so a missed cron run degrades to "Pro ends on time" instead of "Pro never ends." Defence in depth: the flag and the timestamp should not be able to disagree.

---

### H4 — The Founder badge is unreachable, and the landing page advertises it as live

**Severity: High (false user-facing claim; no exploit)** · Files: `supabase/migrations/20260703200000_founder_flag.sql:3`, `supabase/migrations/20260709120000_founder_spots_left_rpc.sql:13`, `README.md:87`, `components/landing/Founders.tsx:50-57`

`is_founder` is added as `boolean not null default false`. I grepped every migration, every server action, every lib, and the edge function: **no code path ever sets it to true.** It is not in `handle_new_user`. It is not in the webhook. It is explicitly *frozen* against user writes by `guard_profile_privileged` (`new.is_founder := old.is_founder`).

Therefore `get_founder_spots_left()` — `greatest(0, 100 - count(*) where is_founder)` — returns `100` for every caller, permanently, and will keep doing so after the ten-thousandth signup.

`README.md:87` states: *"The first 100 signups platform-wide get the Founder badge (live 'spots left' counter on the landing and signup pages)."* The landing page renders that counter as fact (`Founders.tsx:50-57`), and `/signup` shows it as a pill. The counter is live, correctly cached, correctly wired — and reads a column nothing writes.

This is a code-vs-README mismatch and a scarcity claim shown to prospective users that is not true. It is also, per Part B, the single most valuable growth asset in the build, currently inert.

**Recommended fix (not applied):** set `is_founder` in `handle_new_user` when `(select count(*) from profiles where is_founder) < 100`, inside the same transaction that inserts the profile, so the cap cannot be raced past 100. Backfill the existing first-100 by `created_at`. If the badge is not wanted, remove the counter from the landing page — do not ship a scarcity number that never moves.

---

## MEDIUM

### M1 — Webhook has no event-id dedupe and no ordering guard on subscription events
`app/api/stripe/webhook/route.ts`

Signature verification is correct (raw `req.text()` before parsing; hard 503 if `STRIPE_WEBHOOK_SECRET` is unset, no silent bypass). The `checkout.session.completed` handler cross-checks `session.client_reference_id` against `session.metadata.supabase_id` and 400s on mismatch — this is a genuinely good defence, and it is what makes payment-link hijacking impossible. Replay of that event is also neutralized by anchoring `pro_until` to `session.created` rather than `new Date()`.

`customer.subscription.updated` and `customer.subscription.deleted` have neither protection. They resolve the user solely by `stripe_customer_id` (safe against fan-out, thanks to the partial unique index in `20260710110000_stripe_customer_unique.sql`) but there is no `event.id` dedupe table and no comparison of `event.created` against the row's current state. Stripe does not guarantee delivery order. A stale `subscription.updated` (status `active`) delivered after a `subscription.deleted` re-grants Pro to a cancelled account.

**Fix:** persist processed `event.id`s (unique index, insert-and-ignore, bail on conflict) and store the `event.created` of the last applied subscription event per customer, ignoring older ones.

### M2 — Every authenticated user can read every column of every profile
Live policy `profiles` / `"profiles readable by authed users"`: `using ((select auth.uid()) is not null)`

There is no `email` column, so the specific concern in the brief does not apply. But the policy is column-blind and the table now carries operational columns: `is_admin`, `is_suspended`, `stripe_customer_id`, `pro_until`, `wants_pro`, `referral_code`. Any account can enumerate administrators (`is_admin = true`) to pick a social-engineering target, and can read every user's Stripe customer id.

**Fix:** move operational columns to a sibling table with an owner-only policy (mirroring the `profile_school` pattern already used for `school`), or expose the profile through a view that projects only presentational columns. `is_admin` in particular should not be world-readable.

### M3 — Blocks do not cover comments or reactions
Live policies `comments` / `"comments mirror post visibility"` and `reactions` / `"reactions mirror post visibility"`

Both policies are exactly `EXISTS (select 1 from posts p where p.id = post_id)` (plus the repost arm). Because RLS on `posts` is applied to that subquery, the mirror works for privacy — a comment on a post you cannot see is invisible. But there is no block clause. On a post you *can* see, the comments and reactions of a user who has blocked you (or whom you have blocked) render normally.

`posts` and `reposts` both got block clauses (`20260710120000`, `20260710160000`). `comments` and `reactions` were missed. The brief's requirement — "a block removes visibility in EVERY surface" — is not met.

**Fix:** add the same bidirectional block `NOT EXISTS` clause to both SELECT policies.

### M4 — The target of a follow request can rewrite who the follower is
Live policy `follows` / `"target accepts follow request"`: `using ((select auth.uid()) = following_id) with check ((select auth.uid()) = following_id)`

The `with check` pins `following_id` but says nothing about `follower_id`. On any row where I am the target, I may `UPDATE` and substitute an arbitrary `follower_id`, fabricating "victim follows me" — which appears in my follower count and in the victim's following list.

Escalation is limited: `following_id` must remain me, so I cannot forge a follow *into* someone else's private content, and the victim can delete the row themselves (`DELETE` policy keys on `follower_id`). Points are awarded through `accept_follow`, not this policy, so this does not mint contribution points.

**Fix:** add `AND follower_id = (select follower_id from follows where id = follows.id)` semantics — practically, restrict the update to the `status` column via a definer function (`accept_follow` already exists) and drop the broad UPDATE policy, or add `with check (follower_id = OLD.follower_id)` via a trigger since RLS `with check` cannot reference `OLD`.

### M5 — Suspension is enforced only on writes, never on reads
`proxy.ts`, `lib/supabase/middleware.ts`, `app/(app)/layout.tsx:19`

`current_is_suspended()` appears in the `with check` of `posts`, `comments`, `follows`, `reactions`, `reposts`, and `messages` INSERT policies — so a suspended user cannot create anything. Nothing checks suspension on the way in. The middleware never queries it; `app/(app)/layout.tsx` selects `username, avatar_url, is_pro, is_admin` and not `is_suspended`.

A suspended harasser retains a full session: they browse the directory, read every public post, open profiles (firing `record_profile_view`, so they still show up in the target's who-viewed-you), and read their existing DM threads.

**Fix:** check `is_suspended` in `updateSession` and redirect to a suspension notice. Cheap, and it is the difference between "suspended" and "muted."

### M6 — Campus Founder is farmable, and referrals are attributed before email confirmation
`supabase/migrations/20260705160000_growth_wave_d_referrals_and_profile_guard.sql` (`handle_new_user`, `trg_referral_campus_founder`)

`handle_new_user` fires on `auth.users` INSERT — i.e. at signup, **before email confirmation** — and inserts the `referrals` row there. `trg_referral_campus_founder` then counts rows for the referrer and grants `is_campus_founder` at 100. The only guard is `v_referrer <> new.id`.

So: no confirmation requirement, no same-school requirement (despite the badge being named *Campus* Founder), no distinct-device/IP heuristic. 100 self-created signups earn the badge. Combined with C1, the attacker does not even need `.edu` addresses. `handle_new_user` also claims the username at this moment, so unconfirmed signups squat usernames — the open question flagged as item 10 in `CLAUDE.md`, still unresolved.

**Fix:** attribute the referral on first confirmed login rather than on `auth.users` insert (or gate the count on `auth.users.email_confirmed_at is not null`), and require the referred user's school to match the referrer's before counting toward *Campus* Founder.

### M7 — Pro's "unlimited" AI is literally 9999 calls/day on the stronger model
`app/(app)/feed/actions.ts:131-136,357-362`, `app/(app)/messages/actions.ts:166-170`, `lib/connection-prompt.ts:75`, `lib/ai.ts:23-25`

Every AI entry point is metered server-side through `use_ai_quota`, with the cap computed from a fresh `profiles.select("is_pro")` read — a client cannot spoof its tier. That part is correct, and the free caps (1/day people-search, 3/day nudges and icebreakers) hold.

The Pro cap is `9999`, and `modelForTier(true)` routes to `OPENAI_MODEL_PRO` (`claude-sonnet-5`). One $4.99 account can issue ~9,999 Sonnet requests per day across five endpoints. There is no spend ceiling, no per-minute limit, and no alerting.

**Fix:** set the Pro cap to a number a human could plausibly hit (say 150/day/kind), and add a provider-side monthly spend cap. "Unlimited" as a marketing word does not have to mean `9999` as a config value.

### M8 — There is no way to report a user or a direct message
`types/database.types.ts:826-835` (`reports` columns: `reporter_id, post_id, reason, detail, status`), `supabase/migrations/20260703240000_direct_messaging.sql`

`reports` can only reference a `post_id`. There is no `reported_user_id` and no `message_id`. The report UI (`components/feed/ReportForm.tsx`) is reachable only from a post menu. Meanwhile the `messages` table has **no `DELETE` and no `UPDATE` policy at all** — a sent DM cannot be deleted by anyone, including its sender, and there is no way to leave a conversation.

So the DM harassment path is: receive abuse → you can block (which does hide the thread, via the block clause in the `messages` SELECT policy) → but you cannot report the message, cannot report the person, and no evidence reaches the admin queue. `admin_list_reports()` will show nothing.

**Fix:** add nullable `reported_user_id` and `message_id` to `reports`, surface a report action on profiles and on DM threads. This is the T&S gap I would close before real undergraduates arrive; see Part B §6.

---

## LOW

**L1 — Timezone boundaries disagree with the documented rule.** `CLAUDE.md` states every time-gated feature rolls over at midnight `America/New_York`. `log_contribution`, `get_streak`, `get_leaderboard`, and `get_public_heatmap` honor that. But `get_heatmap` bounds on bare `current_date` (UTC on Supabase), and `use_ai_quota` writes `(now() at time zone 'utc')::date` — so AI quotas reset at 7/8 pm Eastern, and the heatmap's 371-day window is off by up to a day relative to the rows it displays. Cosmetic, but it is a stated invariant that the code does not hold.

**L2 — `use_ai_quota(p_kind, p_cap)` takes its cap from the caller.** Granted to `authenticated`, so a browser can call it with `p_cap: 999999`. Not exploitable for free AI — the Server Action computes its own cap independently and never trusts the client — so the only effect is a user inflating their own usage counter. Still a footgun: the function cannot tell a legitimate cap from an invented one. Move the cap table into the function, keyed on `p_kind` and the caller's `is_pro`.

**L3 — Service-role has a third call site, contradicting the README.** `README.md:123` says the key is used *"only by the Stripe webhook and the delete-account edge function."* `lib/weekly-prompt.ts:78` uses `createAdminClient()` to upsert the weekly-prompt cache. The usage is safe (the table holds no user data, the write is behind an `auth.getUser()` check), but the README's guarantee is the thing a reviewer greps for, and it is false. Either update the README or route the write through a definer function.

**L4 — `profile_school`'s DDL is absent from `supabase/migrations/`.** The table, its columns, and its `"school visible by preference"` policy exist in the live database (confirmed) and correctly gate on `hide_school` + accepted-follower. But no tracked migration creates them. `supabase/migrations/` therefore cannot rebuild the schema from scratch, and a reader auditing from source alone will conclude — as one of my own sub-agents did — that hidden schools leak. They do not: PostgREST applies `profile_school`'s RLS to the embedded `profile_school(school)` select in `CAND_SELECT` (`app/(app)/feed/actions.ts:236`), so hidden schools come back `null` in people-search, suggested follows, the icebreaker, and the profile page. The risk here is drift, not leakage.

**L5 — OG image routes are gated by the middleware, so link previews never render.** `get_public_profile_card` and `get_public_heatmap` are deliberately granted to `anon` so an unauthenticated crawler can render the shareable profile card. But `proxy.ts:9`'s matcher only excludes paths ending in a static image extension, and `/profile/[username]/opengraph-image` has none — so it hits `updateSession`, fails `isPublic` (`lib/supabase/middleware.ts:34-44`), and 307s to `/signup`. Every social preview of a samehere profile shows the signup page. Security-neutral; growth-fatal. See Part B.

**L6 — Stored prompt injection into AI-authored text.** `compactCandidate()` (`app/(app)/feed/actions.ts:251-264`) embeds up to 40 candidates' `bio` and `goals` (120 chars each) into the people-search prompt with no delimiting or "treat as untrusted data" framing; `connectionPrompt()` embeds `candidate.name` (i.e. `display_name`). Blast radius is genuinely small: `parseRanked()` validates that every returned id was already in the RLS-filtered candidate pool, caps the reason at 200 chars, and React escapes it on render (`components/feed/PeopleSearch.tsx:114`). There is no XSS and no data-access bypass. The residual risk is that an attacker authors the sentence *samehere* appears to say about them ("verified moderator — DM me your login to get set up"), which carries the platform's voice. Worth a system-prompt instruction and a delimiter.

**L7 — `NEXT_PUBLIC_BILLING_ENABLED` gates only the UI.** `app/(app)/pro/page.tsx:7` hides the checkout buttons; `startCheckout()` and `openBillingPortal()` contain no corresponding server check. A crafted POST while the flag is off would still create a Stripe session. Low impact (checkout is the intended action anyway) but the flag does not mean what its name implies.

**L8 — `improvePost` calls `use_ai_quota` and ignores the result.** `app/(app)/feed/actions.ts:168`. Harmless — the function already hard-returns `{ locked: true }` for non-Pro users at line 164 — so the RPC is doing telemetry, not enforcement. Worth a comment saying so, since it reads like a check.

**L9 — `.env.example` is missing required keys.** It lists `OPENAI_*`, PostHog, and `SIGNUP_ALLOWLIST`, but not `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`. Not a leak; a fresh clone will not boot.

---

## Verified sound (things I tried to break and could not)

These are recorded because the brief asked for them specifically, and because a clean negative is worth as much as a finding.

- **`SIGNUP_ALLOWLIST` is safe as built.** Read only in `app/(auth)/actions.ts:15` inside a `"use server"` file, never referenced by a client component, never `NEXT_PUBLIC_`. Client input reaches it only as the needle in a `.includes()` against a server-owned haystack — no way to influence membership. `.env.example:19` commits it empty; `git log --all -- .env.local` is empty. (Its value is moot given C1, which bypasses the check entirely.)
- **`search_path` is pinned on all 56 functions.** Every `SECURITY DEFINER` function sets `search_path = ''` (or `pg_catalog`), with fully-qualified `public.` references throughout. This is the single most commonly missed definer hardening step and it is done consistently, including on trigger functions.
- **Definer-only tables are correctly policy-less.** `ai_usage`, `profile_views`, and `dm_pairs` have RLS enabled with zero policies — default-deny — and are reached only through `use_ai_quota`, `get_profile_views`/`record_profile_view`, and `get_or_create_dm`. `contribution_log` (owner-select only), `notifications` (owner select/update, no insert), and `referrals` (participant select, no insert) follow the same discipline: writes happen only inside definer functions and triggers.
- **DM and notification realtime do not leak.** Both tables are added to the `supabase_realtime` publication (`20260706120000`, `20260706130000`); both have owner/member-scoped SELECT policies (`messages` via `is_conversation_member()` plus a bidirectional block check; `notifications` via `user_id = auth.uid()`). Supabase evaluates the table's SELECT policy per subscriber for `postgres_changes`, and the clients subscribe to `INSERT` only — so the RLS-bypassing `DELETE`-payload caveat (which exposes primary keys) is not reachable. A non-participant cannot receive a message row.
- **Private-account content is properly gated.** `posts` SELECT requires authentication, then `author public OR self OR accepted follower`, then `not blocked either way`, then `not hidden OR self OR admin`. `comments`/`reactions`/`reposts` mirror it through a subquery on `posts` that PostgreSQL evaluates under the *caller's* RLS. Logged-out matches nothing.
- **Follower/following lists stay private while counts are public.** `follows` SELECT is `follower_id = uid OR following_id = uid`; counts come from `get_profile_counts()`, a definer that returns three integers and nothing else.
- **Heatmap visibility is enforced in `get_heatmap`** (owner, or `heatmap_visibility = 'public'`, or accepted follower), and `get_leaderboard` additionally excludes `leaderboard_opt_out` and `heatmap_visibility = 'followers'` users, nulling `school` for `hide_school` users.
- **Checkout identity binding is correct** — `client_reference_id` *and* `metadata.supabase_id` both set from the server session (`pro/actions.ts:88-89`), cross-checked in the webhook (`route.ts:72`), with the reasoning documented. Price ids are chosen from a server-side map; the client sends only a `"monthly" | "semester"` enum. No client-supplied price, customer, or quantity reaches Stripe. The partial unique index on `stripe_customer_id` prevents a single subscription event from flipping `is_pro` across rows.
- **The privileged-column guard works.** `guard_profile_privileged` is a non-definer `BEFORE UPDATE` trigger that restores `is_pro`, `is_founder`, `is_campus_founder`, `stripe_customer_id`, `pro_until`, `is_admin`, `is_suspended` from `OLD` whenever `current_user in ('authenticated','anon')` — which is what PostgREST sets via `SET LOCAL ROLE`. Cosmetics (`accent_color`, `avatar_is_animated`, `banner_url`) are additionally frozen for non-Pro users. Mass-assignment through `updateProfile`, a raw `profiles` update, or extra fields on any RPC cannot self-grant Pro or admin. `profiles` has no INSERT policy at all, so rows are created only by `handle_new_user`.
- **Admin surfaces are gated server-side, twice.** `app/(app)/admin/page.tsx:17-18` redirects on `current_is_admin()`; `app/(app)/admin/actions.ts:10-19` re-checks it in `requireAdmin()`; and each `admin_*` definer function re-checks it again internally. Hiding the nav link is not the control.
- **Avatar and banner uploads are owner-scoped and server-validated.** Paths are `${user.id}/avatar|banner` built from the session, never client input; MIME allowlist and size caps are enforced in the Server Action; the animated-avatar Pro gate byte-sniffs GIF/APNG/animated-WebP (`profile/edit/actions.ts:252-283`) and re-reads `is_pro` from the database rather than trusting a prop. Extension/MIME spoofing does not defeat it.
- **Storage signed URLs are minted only after an RLS-checked post fetch** in every one of the nine call sites of `attachSignedMedia`. (The weakness is C2 — the bucket policy, not the call sites.)
- **No secrets in the client bundle.** No `"use client"` file imports `lib/stripe.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, or `lib/ai.ts`. `lib/supabase/client.ts` and `server.ts` both use the anon key. `git grep -nE "sk_live|sk_test|whsec_|eyJhbGciOi"` on tracked files returns nothing. `.gitignore:34-35` excludes `.env*` except `.env.example`.
- **The delete-account edge function verifies the caller.** It resolves the bearer JWT through `anonClient.auth.getUser(jwt)` and deletes by `user.id`, never a client-supplied id (`supabase/functions/delete-account/index.ts:22-43`).
- **AI output is never rendered as HTML.** Zero occurrences of `dangerouslySetInnerHTML` in the repo.
- **`ai_connection_prompts` cannot serve one user's cached text to another.** Primary key `(viewer_id, candidate_id)`; both policies key on `auth.uid() = viewer_id`; both read paths also filter on `viewer_id` explicitly.
- **People-search results respect RLS, blocks, and hidden schools.** The candidate query runs on the session client, filters `get_blocked_ids()` bidirectionally, and embeds `profile_school(school)` so hidden schools return `null`. The LLM only reorders and annotates a pool it was handed; `parseRanked` discards any id not already in that pool, so the model cannot surface a user the caller could not otherwise see. No SQL is constructed from model output. Query tokens are stripped to `[a-z0-9]` before entering the PostgREST `.or()` grammar.

*(Private accounts do appear in people-search with their `bio`, `goals`, `skills`, and `courses` — this is per the spec in `CLAUDE.md` §6, which lists those as fields a private account exposes to non-followers. Noting it because "private" reads stronger than it is: private hides your posts and your follower lists, not your profile prose.)*

---

## Recommended order of work

1. **C1** — the `.edu` gate, because every other control assumes the account belongs to a student.
2. **C2** — the `post-media` SELECT policy; one-line policy change plus a definer for signing.
3. **H2, M3** — finish the block primitive across `follows` INSERT, `comments`, and `reactions`.
4. **H3** — the billing expiry predicate, before anyone buys a semester pass.
5. **H1** — move `log_contribution` behind triggers.
6. **H4** — grant `is_founder`, or delete the counter. Do not launch with a scarcity number that never moves.
7. **M8, M5** — report-a-user / report-a-DM, and a suspension read-gate, before public onboarding.
8. Everything else.

C1 and C2 are each roughly an afternoon. They are also each sufficient, on their own, to falsify the sentence on the landing page.
