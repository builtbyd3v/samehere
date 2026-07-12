-- ============================================================================
-- BASELINE PART 2: core tables (profiles, follows, posts, comments,
-- reactions, bookmarks, contribution_log) — also created via the dashboard,
-- never captured in supabase/migrations/, and referenced by nearly every
-- migration in this directory (FKs, RLS policies, triggers, `insert into`).
-- A fresh `supabase db reset` died on the FIRST tracked migration below with
-- "relation public.profiles does not exist" because of this gap — and the
-- BASELINE PART 1 section further down (profile_school/reports/reposts)
-- couldn't have worked either, since it FK-references public.profiles and
-- public.posts, neither of which any migration file creates.
--
-- Found by inventory: grepped every `alter table public.X`, `references
-- public.X`, `create policy ... on public.X`, `create index ... on
-- public.X`, `create trigger ... on public.X`, `insert into public.X` across
-- supabase/migrations/*.sql, then subtracted every `create table` (including
-- this file). The remainder was exactly these seven tables — every OTHER
-- table referenced elsewhere (blocks, conversations, conversation_members,
-- messages, notifications, reposts, referrals, feedback, profile_views,
-- clubs, dm_pairs, ai_usage, ...) already has a `create table` of its own
-- somewhere in this directory. No missing enum types or sequences turned up
-- the same way (none exist in this schema).
--
-- Shapes here are ORIGINAL (pre-migration), same rule as BASELINE PART 1.
-- Every column added later via `add column if not exists` is deliberately
-- left OUT below — that statement is idempotent and self-sufficient whether
-- or not this file creates the column first, so listing it here would only
-- be duplicate documentation (this is why profiles below has 12 columns, not
-- today's 30: is_pro, is_founder, accent_color, ..., profile_theme are all
-- `add column if not exists`). What IS listed below is only what a later
-- migration's UNGUARDED statement needs to already find in place:
--   posts constraint post_min_len        <- dropped (unguarded) by
--                                          20260702234829, replaced with
--                                          post_not_empty. Original min-length
--                                          value inferred from that same
--                                          file's own point-award thresholds
--                                          (post qualifies at >=150 chars,
--                                          comment at >=50) — not stated
--                                          explicitly anywhere as a constraint
--                                          literal, so treat as a documented
--                                          inference, not a verified fact.
--   comments constraint comment_min_len  <- same migration, same inference.
--   follows unique(follower_id, following_id)
--                                        <- request_follow(), defined in
--                                          20260703011958, does `insert ...
--                                          on conflict (follower_id,
--                                          following_id)`, which requires
--                                          this exact unique constraint.
--   policy "user follows user" (follows) <- bare `drop policy` with no `if
--                                          exists` in 20260703011958 (then
--                                          immediately recreated there).
--   policy "authed users create posts" (posts),
--   policy "authed user create comment" (comments),
--   policy "user reacts to post" (reactions)
--                                        <- each hit by a bare `alter
--                                          policy` (never a `create policy`)
--                                          starting at 20260706170000 /
--                                          20260706190000 / 20260708004527.
--   policy "posts visible by privacy" (posts)
--                                        <- same: bare `alter policy` in
--                                          20260706170000, predating the
--                                          guarded drop-if-exists+create in
--                                          20260710120000 / 20260711110000.
-- Policies a later migration ALWAYS recreates behind `drop policy if exists`
-- (comments/reactions "... mirror post visibility") are skipped here
-- entirely — nothing needs them to pre-exist, so adding them here would only
-- be redundant with what that migration already does safely. `repost_id` on
-- comments/reactions/bookmarks (and its target-shape CHECK) is added the
-- same guarded way by 20260703260000 — also skipped here, which is also why
-- reposts (BASELINE PART 1, below) can stay physically below these tables
-- despite reactions/comments/bookmarks having an FK to it in production.
--
-- Every table below already exists in production, so `create table if not
-- exists` is a complete no-op there (constraints/columns inside are never
-- inspected once the table is found) — applying this file to live prod
-- remains a no-op, same invariant as BASELINE PART 1. Table-level grants to
-- anon/authenticated are intentionally omitted, matching BASELINE PART 1:
-- confirmed via information_schema.table_privileges that Supabase's default
-- privileges already grant these at table-creation time; RLS is what
-- actually gates access.
--
-- NOT handled here: the `on_auth_user_created` trigger binding
-- `handle_new_user()` to `auth.users` is ALSO dashboard-only — confirmed by
-- 20260711160000's own comment ("The existing on_auth_user_created AFTER
-- INSERT trigger on auth.users... proves migrations may create triggers on
-- auth.users at all") — and no tracked migration creates it. It can NOT be
-- added to this file, though: `handle_new_user()` itself isn't defined until
-- 20260705160000_growth_wave_d_referrals_and_profile_guard.sql, and CREATE
-- TRIGGER resolves its target function at creation time, so binding it here
-- (timestamp 0) would fail with "function does not exist". A fresh replay
-- will finish green regardless — no tracked migration's DDL depends on this
-- trigger existing — but signups on a fresh local stack will not populate
-- public.profiles until a real migration (timestamped after 20260705160000)
-- adds it. Flagged for a follow-up migration, intentionally not fixed here.
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$')
    constraint username_not_reserved check (username <> all (array[
      'edit','api','dashboard','feed','post','login',
      'signup','auth','admin','profile','search','saved'
    ])),
  display_name text,
  avatar_url text,
  major text,
  year text check (year in ('freshman','sophomore','junior','senior','grad')),
  bio text,
  goals text,
  -- skills: dashboard-era column, never added by a tracked migration (courses
  -- is, at 20260705150000). Referenced by 20260711140000 before being dropped
  -- at 20260713182000_remove_skills_courses. Present here so a fresh replay has
  -- it to reference and then drop; matches prod (where it's since been dropped).
  skills text[],
  is_private boolean not null default false,
  heatmap_visibility text not null default 'public' check (heatmap_visibility in ('public','followers')),
  hide_school boolean not null default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles readable by authed users') then
    create policy "profiles readable by authed users" on public.profiles
    for select using ((select auth.uid()) is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='users update own profile') then
    create policy "users update own profile" on public.profiles
    for update using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);
  end if;
end $$;
-- No insert/delete policy: rows are only ever inserted by the (dashboard-only,
-- see note above) handle_new_user() trigger, which runs SECURITY DEFINER and
-- bypasses RLS; nothing in this codebase deletes a profile row directly.

-- ---------------------------------------------------------------------------
-- follows: created before posts below because "posts visible by privacy"
-- references it.
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  status text default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (follower_id, following_id)
);
alter table public.follows enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='see own follow rows') then
    create policy "see own follow rows" on public.follows
    for select using ((select auth.uid()) = follower_id or (select auth.uid()) = following_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='user follows user') then
    create policy "user follows user" on public.follows
    for insert with check ((select auth.uid()) = follower_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='user unfollows user') then
    create policy "user unfollows user" on public.follows
    for delete using ((select auth.uid()) = follower_id);
  end if;
end $$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null constraint post_min_len check (char_length(content) >= 150),
  created_at timestamptz default now()
);
alter table public.posts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='posts' and policyname='posts visible by privacy') then
    create policy "posts visible by privacy" on public.posts
    for select using (
      (select auth.uid()) is not null
      and (
        exists (select 1 from public.profiles p where p.id = posts.user_id and p.is_private = false)
        or (select auth.uid()) = user_id
        or exists (
          select 1 from public.follows f
          where f.following_id = posts.user_id
            and f.follower_id = (select auth.uid())
            and f.status = 'accepted'
        )
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='posts' and policyname='authed users create posts') then
    create policy "authed users create posts" on public.posts
    for insert with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='posts' and policyname='users delete own posts') then
    create policy "users delete own posts" on public.posts
    for delete using ((select auth.uid()) = user_id);
  end if;
end $$;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null constraint comment_min_len check (char_length(content) >= 50),
  created_at timestamptz default now()
);
alter table public.comments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='authed user create comment') then
    create policy "authed user create comment" on public.comments
    for insert with check (
      (select auth.uid()) = user_id
      and exists (select 1 from public.posts p where p.id = comments.post_id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='user deletes comment') then
    create policy "user deletes comment" on public.comments
    for delete using ((select auth.uid()) = user_id);
  end if;
end $$;
-- "comments mirror post visibility" (select) intentionally not created here:
-- 20260710120000 always creates it behind `drop policy if exists`.

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'samehere')),
  created_at timestamptz default now(),
  unique (post_id, user_id, type)
);
alter table public.reactions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reactions' and policyname='user reacts to post') then
    create policy "user reacts to post" on public.reactions
    for insert with check (
      (select auth.uid()) = user_id
      and exists (select 1 from public.posts p where p.id = reactions.post_id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reactions' and policyname='user removes reaction') then
    create policy "user removes reaction" on public.reactions
    for delete using ((select auth.uid()) = user_id);
  end if;
end $$;
-- "reactions mirror post visibility" (select) intentionally not created here,
-- same reason as comments above.

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);
alter table public.bookmarks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bookmarks' and policyname='user bookmarks post') then
    create policy "user bookmarks post" on public.bookmarks
    for insert with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bookmarks' and policyname='user removes bookmark') then
    create policy "user removes bookmark" on public.bookmarks
    for delete using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bookmarks' and policyname='user selects bookmark') then
    create policy "user selects bookmark" on public.bookmarks
    for select using ((select auth.uid()) = user_id);
  end if;
end $$;

create table if not exists public.contribution_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  action_type text not null check (action_type in ('post', 'comment', 'connection', 'profile_update')),
  points integer not null,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.contribution_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contribution_log' and policyname='user selects contribution_log') then
    create policy "user selects contribution_log" on public.contribution_log
    for select using ((select auth.uid()) = user_id);
  end if;
end $$;
-- No insert policy: log_contribution()/_log_contribution() write it via
-- SECURITY DEFINER only. unique index (not a table constraint, matching the
-- exact name later dropped) backs the `on conflict (user_id, date,
-- action_type)` in log_contribution() (20260702234829).
create unique index if not exists contribution_log_user_id_date_action_type_idx
  on public.contribution_log (user_id, date, action_type);

-- ============================================================================
-- BASELINE PART 1: DDL that exists in production but in no tracked migration (L4).
-- ============================================================================
-- `profile_school`, `reports`, and `reposts` were created directly against the
-- database and never captured in supabase/migrations/. Consequences:
--   * a fresh clone could not rebuild the schema — later migrations ALTER these
--     tables and would fail on "relation does not exist";
--   * a reviewer auditing from source alone cannot see the policies that gate
--     `hide_school` (one of my own sub-agents concluded hidden schools leaked,
--     because the policy proving otherwise is not in this directory).
--
-- Timestamp 00000000000000 so this sorts FIRST and a fresh `supabase db reset`
-- creates these tables before anything alters them.
--
-- Shapes here are the ORIGINAL ones, not today's. Later tracked migrations add
-- the rest, and several use a plain `add column` that would fail if this file
-- created the current shape:
--   reports.detail            <- 20260703231639_trust_safety.sql
--   reports.reported_user_id / message_id / target_type / snapshot,
--     and the post_id FK flip CASCADE -> SET NULL
--                             <- 20260711130000_report_targets_and_dm_controls.sql
--   reports_status_check      <- 20260706180000_fix_admin_report_status.sql
--   reposts.quote_text        <- 20260703210000_repost_quotes.sql
--
-- Everything is idempotent (`if not exists`, policy-existence guards), so
-- applying this to the live database is a no-op. It is a reproducibility fix,
-- not a schema change.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profile_school: `school` lives here, not on profiles, so the SELECT policy
-- can hard-hide it from non-followers when hide_school is set. Reads LEFT JOIN
-- this table, so RLS returns the school or NULL automatically — no function.
-- ---------------------------------------------------------------------------
create table if not exists public.profile_school (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school text
);
alter table public.profile_school enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_school' and policyname='school visible by preference') then
    create policy "school visible by preference" on public.profile_school
    for select using (
      (select auth.uid()) is not null
      and (
        (select auth.uid()) = profile_id
        or exists (select 1 from public.profiles p where p.id = profile_school.profile_id and p.hide_school = false)
        or exists (
          select 1 from public.follows f
          where f.following_id = profile_school.profile_id
            and f.follower_id = (select auth.uid())
            and f.status = 'accepted'
        )
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_school' and policyname='owner inserts own school') then
    create policy "owner inserts own school" on public.profile_school
    for insert with check ((select auth.uid()) = profile_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_school' and policyname='owner updates own school') then
    create policy "owner updates own school" on public.profile_school
    for update using ((select auth.uid()) = profile_id)
    with check ((select auth.uid()) = profile_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- reports: original shape. Insert by any authed user as themselves; select only
-- your own. Triage happens through admin_list_reports(), a definer.
-- The post FK is CASCADE here because that is what shipped; 20260711130000
-- flips it to SET NULL so a report outlives the post it is about.
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text,
  status text not null default 'open',
  created_at timestamptz default now()
);
alter table public.reports enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reports' and policyname='user reports') then
    create policy "user reports" on public.reports
    for insert with check ((select auth.uid()) = reporter_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reports' and policyname='user selects reports') then
    create policy "user selects reports" on public.reports
    for select using ((select auth.uid()) = reporter_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- reposts: original shape. A private account's post cannot be reposted — no
-- amplifying private content. Later migrations rewrite the SELECT policy for
-- blocks (20260710160000, 20260711110000) and the INSERT policy for suspension
-- (20260706190000); both drop-then-create, so these originals are safe here.
-- ---------------------------------------------------------------------------
create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);
alter table public.reposts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reposts' and policyname='reposts mirror post visibility') then
    create policy "reposts mirror post visibility" on public.reposts
    for select using (exists (select 1 from public.posts p where p.id = reposts.post_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reposts' and policyname='repost only public-author posts') then
    create policy "repost only public-author posts" on public.reposts
    for insert with check (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.posts p
        join public.profiles pr on pr.id = p.user_id
        where p.id = reposts.post_id and pr.is_private = false
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reposts' and policyname='user removes repost') then
    create policy "user removes repost" on public.reposts
    for delete using ((select auth.uid()) = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- rls_auto_enable + the `ensure_rls` event trigger: dashboard-era safety net
-- that enables RLS on every new public table at CREATE TABLE time. Created in
-- no tracked migration, but 20260706150000_revoke_internal_definer_execute.sql
-- revokes EXECUTE on the function, so a fresh replay dies without it. Shape
-- captured from production (pg_get_functiondef, 2026-07-12); nothing later
-- redefines it. Both guarded so re-applying to the live database is a no-op.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    create function public.rls_auto_enable()
    returns event_trigger
    language plpgsql
    security definer
    set search_path to 'pg_catalog'
    as $fn$
    declare
      cmd record;
    begin
      for cmd in
        select *
        from pg_event_trigger_ddl_commands()
        where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
          and object_type in ('table','partitioned table')
      loop
         if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
          begin
            execute format('alter table if exists %s enable row level security', cmd.object_identity);
            raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
          exception
            when others then
              raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
          end;
         else
            raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
         end if;
      end loop;
    end;
    $fn$;
  end if;

  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- get_profile_counts: dashboard-era definer. No tracked migration creates it,
-- but 20260708004649_revoke_anon_execute_rpc_backstop.sql (and the explicit
-- sibling) revoke EXECUTE on it, so a fresh replay dies without it. Shape
-- captured from production (pg_get_functiondef, 2026-07-12); nothing later
-- redefines it. create-or-replace so re-applying to the live database is a no-op.
-- ---------------------------------------------------------------------------
create or replace function public.get_profile_counts(p_profile_id uuid)
returns table(posts bigint, followers bigint, following bigint)
language sql security definer set search_path = '' as $$
  select
    (select count(*) from public.posts   where user_id = p_profile_id),
    (select count(*) from public.follows where following_id = p_profile_id and status = 'accepted'),
    (select count(*) from public.follows where follower_id  = p_profile_id and status = 'accepted')
  where auth.uid() is not null;
$$;
