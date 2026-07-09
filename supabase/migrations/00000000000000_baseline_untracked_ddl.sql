-- ============================================================================
-- BASELINE: DDL that exists in production but in no tracked migration (L4).
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
