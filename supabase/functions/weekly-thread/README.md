# weekly-thread

Scheduled edge function backing the weekly AI prompt threads feature
(`supabase/migrations/20260714130000_threads.sql`). Runs as `service_role`
because it has to insert/update `threads` and read `posts` with no logged-in
user — the same reason `delete-account` is an edge function instead of app
code (see CLAUDE.md: no `service_role` key in the Next app).

Two modes, chosen by the JSON POST body:

```json
{ "mode": "generate" }    // Monday: write this week's prompt
{ "mode": "summarize" }   // Sunday: summarize this week's responses
```

## Deploy

```bash
supabase functions deploy weekly-thread --no-verify-jwt
```

`--no-verify-jwt` is required: the caller is a cron scheduler, not a logged-in
user, so there is no Supabase JWT to verify. Authorization is instead the
`x-thread-cron-secret` header checked in constant time inside the function —
do not deploy this function without that env var set (see Secrets below).

## Secrets

Set with `supabase secrets set` (or the dashboard, Project Settings → Edge
Functions → Secrets):

| Secret | Purpose |
|---|---|
| `THREAD_CRON_SECRET` | Shared secret the scheduler must send as `x-thread-cron-secret`. Generate with e.g. `openssl rand -hex 32`. Without this set, every request is rejected — the function fails closed. |
| `OPENAI_API_KEY` | Same key the Next app uses (see CLAUDE.md Tech Stack — currently an Anthropic key against `https://api.anthropic.com/v1/`). |
| `OPENAI_BASE_URL` | e.g. `https://api.anthropic.com/v1/`. |
| `OPENAI_MODEL` | e.g. `claude-sonnet-5`. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into
every Supabase edge function — do not set them yourself.

## Scheduling both modes

Trigger with an HTTP POST to
`https://<project-ref>.supabase.co/functions/v1/weekly-thread`, header
`x-thread-cron-secret: <THREAD_CRON_SECRET>`, body `{"mode":"generate"}` or
`{"mode":"summarize"}`.

**Simplest option:** Supabase Dashboard → Integrations → Cron. Its scheduler
lets you pick a named IANA timezone directly, so you can schedule literally
"Monday 00:05 America/New_York" / "Sunday 23:30 America/New_York" and let
Supabase handle DST. Set the request body and the `x-thread-cron-secret`
header in the job's HTTP config.

**If your scheduler only accepts UTC cron** (raw `pg_cron`/`pg_net`, GitHub
Actions, an external cron host): `America/New_York` is UTC-5 (EST, roughly
early Nov–mid Mar) or UTC-4 (EDT, roughly mid Mar–early Nov). The function
itself computes the correct Monday from `America/New_York` wall-clock time
regardless of exactly when it's invoked, so the goal is just to fire
comfortably inside the intended NY calendar day, not at a precise instant —
these UTC times leave a safety margin on both sides of the DST boundary:

| Mode | Intent | UTC cron | Cron expr | EST equivalent | EDT equivalent |
|---|---|---|---|---|---|
| `generate` | Monday, early morning ET, after the summarize run | `06:00 UTC Mon` | `0 6 * * 1` | 01:00 Mon | 02:00 Mon |
| `summarize` | Sunday night ET, before Monday's `generate` run | `03:00 UTC Mon` | `0 3 * * 1` | 22:00 Sun | 23:00 Sun |

Both land squarely inside the intended NY calendar day in both DST states,
with `summarize` running a few hours before `generate` so a fresh `threads`
row always exists for that week by the time anyone can post into it.

## Manual override

`threads.week_start` is `UNIQUE` by design — that constraint *is* the
override mechanism. To force a specific prompt for a given week, hand-insert
the row before the `generate` cron fires:

```sql
insert into public.threads (week_start, prompt)
values ('2026-07-20', 'What''s a class everyone warned you about that turned out fine?');
```

The scheduled `generate` call for that week will then hit a `23505` unique
violation, which the function treats as a successful no-op (`"already set,
skipping"`) — your hand-written prompt is left in place, not overwritten.

To force a re-summarize (e.g. the AI summary was bad), clear the existing one
so `summarize` picks the thread up again:

```sql
update public.threads set summary = null where week_start = '2026-07-20';
```

## Response shapes

Every call returns `200` on success **and** on an expected no-op — a
scheduler should only alert/retry on non-2xx:

```jsonc
// generate, wrote a new prompt
{ "ok": true, "week_start": "2026-07-20", "prompt": "..." }

// generate, human already set this week's prompt
{ "ok": true, "skipped": true, "reason": "already set, skipping", "week_start": "2026-07-20" }

// summarize, wrote a summary
{ "ok": true, "week_start": "2026-07-20", "thread_id": "...", "summary_length": 842 }

// summarize, not enough responses yet
{ "ok": true, "skipped": true, "reason": "too few responses", "count": 1 }

// summarize, no pending (unset-summary) thread for the current week
{ "ok": true, "skipped": true, "reason": "no pending thread this week", "week_start": "2026-07-20" }
```

Non-2xx (`401`/`400`/`405`/`500`) means a real failure — bad/missing secret,
malformed body, or the AI call / DB write failed — and the scheduler's retry
is meaningful.
