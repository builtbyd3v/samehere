-- Schema fixture for 20260910100000_portfolio_data_contracts.sql +
-- supabase/tests/portfolio_data_test.sql when the full migration chain cannot
-- replay (missing native pg_cron .so / other platform pieces).
--
-- FIDELITY LIMIT: this is NOT a full Supabase or full samehere schema.
-- Only tables/functions the new migration and its SQL test actually read,
-- write, or replace, derived from existing migrations. Clubs, DMs, jobs,
-- storage policies, cron jobs, and most RLS history are absent.
-- Do not treat a green fixture run as proof the whole app schema applies.

-- Source: 00000000000000_baseline_untracked_ddl.sql (original profiles)
-- plus later add-column migrations consumed by the portfolio file.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$')
    constraint username_not_reserved check (username <> all (array[
      'edit','api','dashboard','feed','post','login',
      'signup','auth','admin','profile','search','saved'
    ])),
  display_name text,
  avatar_url text,
  banner_url text,
  accent_color text,
  major text,
  year text check (year in ('freshman','sophomore','junior','senior','grad')),
  bio text,
  goals text,
  is_private boolean not null default false,
  heatmap_visibility text not null default 'public'
    check (heatmap_visibility in ('public','followers')),
  hide_school boolean not null default false,
  is_pro boolean not null default false,
  is_founder boolean not null default false,
  is_campus_founder boolean not null default false,
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  is_bot boolean not null default false,
  verified_student boolean not null default false,
  pro_until timestamptz,
  referral_code text unique,
  email_domain text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by authed users" on public.profiles
  for select using ((select auth.uid()) is not null);

create policy "users update own profile" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Source: 00000000000000_baseline_untracked_ddl.sql + 20260702234829 (min len
-- dropped to post_not_empty) + 20260703170000 media + 20260705150000 post_type
-- + 20260706170000 hidden.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null constraint post_not_empty check (char_length(content) >= 1),
  created_at timestamptz default now(),
  hidden boolean not null default false,
  media jsonb not null default '[]'::jsonb,
  post_type text
);
alter table public.posts enable row level security;

create policy "authed users create posts" on public.posts
  for insert with check ((select auth.uid()) = user_id);

create policy "users select own or public posts" on public.posts
  for select using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = posts.user_id and p.is_private = false
    )
  );

-- Source: 00000000000000_baseline_untracked_ddl.sql
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  status text default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (follower_id, following_id)
);
alter table public.follows enable row level security;

create policy "see own follow rows" on public.follows
  for select using (
    (select auth.uid()) = follower_id or (select auth.uid()) = following_id
  );

-- Source: 20260703231639_trust_safety.sql
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;

create policy "owner read" on public.blocks
  for select using (auth.uid() = blocker_id);
create policy "owner insert" on public.blocks
  for insert with check (auth.uid() = blocker_id);
create policy "owner delete" on public.blocks
  for delete using (auth.uid() = blocker_id);

-- Source: 00000000000000_baseline_untracked_ddl.sql
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'samehere')),
  created_at timestamptz default now(),
  unique (post_id, user_id, type)
);
alter table public.reactions enable row level security;

-- Source: 00000000000000_baseline_untracked_ddl.sql
create table public.reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);
alter table public.reposts enable row level security;

-- Source: 00000000000000_baseline_untracked_ddl.sql
create table public.profile_school (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school text
);
alter table public.profile_school enable row level security;

-- Source: 20260719120000_experiences.sql + 20260720131000 + 20260720150000
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('internship', 'job', 'research', 'club_role')),
  org text not null check (char_length(org) <= 80),
  role text not null check (char_length(role) <= 80),
  term text check (term is null or char_length(term) <= 40),
  note text check (note is null or char_length(note) <= 600),
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.experiences enable row level security;

-- Source: 20260720131000_experience_dates_and_education.sql + 20260720140000
-- + 20260720150000
create table public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school text not null check (char_length(school) <= 80),
  degree text check (degree is null or char_length(degree) <= 80),
  field text check (field is null or char_length(field) <= 80),
  class_year text check (class_year is null or char_length(class_year) <= 20),
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.education enable row level security;

-- Source: 20260711120050_is_pro_now.sql (verbatim rule)
create or replace function public.is_pro_now(p_is_pro boolean, p_pro_until timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(p_is_pro, false) and (p_pro_until is null or p_pro_until > now());
$$;

-- Source: 20260706170000_admin_moderation.sql
create or replace function public.current_is_suspended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_suspended)
$$;

-- Source: 20260703233000_block_system.sql
create or replace function public.block_user(target uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_me = target then raise exception 'cannot block yourself'; end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_me, target)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.follows
  where (follower_id = v_me and following_id = target)
     or (follower_id = target and following_id = v_me);
end;
$function$;

-- Source: 20260703233000_block_system.sql + 20260711110000 (stable)
-- + 20260718120000 (anon execute)
create or replace function public.get_blocked_ids()
returns setof uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid();
$function$;

-- Source: 20260723100000_end_beta_pro_grant.sql (latest handle_new_user)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_domain text := lower(split_part(new.email, '@', 2));
  v_base text;
  v_candidate text;
  v_tries int := 0;
begin
  if v_username is null
     or v_username !~ '^[a-z0-9_]{3,20}$'
     or v_username in ('edit','api','dashboard','feed','post','login',
                        'signup','auth','admin','profile','search','saved')
  then
    v_base := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
    v_base := left(v_base, 15);
    if length(v_base) < 3 then
      v_base := left('user' || v_base, 15);
    end if;
    if v_base in ('edit','api','dashboard','feed','post','login',
                   'signup','auth','admin','profile','search','saved') then
      v_base := v_base || '_';
    end if;

    v_candidate := v_base;
    while exists (select 1 from public.profiles where username = v_candidate) and v_tries < 10 loop
      v_tries := v_tries + 1;
      v_candidate := v_base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
    end loop;
    if exists (select 1 from public.profiles where username = v_candidate) then
      v_candidate := 'user_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    end if;
    v_username := v_candidate;
  end if;

  insert into public.profiles (id, username, referral_code, email_domain, is_founder, verified_student)
  values (new.id, v_username, v_username, v_domain,
          (select count(*) from public.profiles where is_founder) < 100,
          v_domain ~ '\.edu$');
  return new;
end;
$function$;

-- Source: 20260705160500_bind_on_auth_user_created_trigger.sql
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant execute on function public.is_pro_now(boolean, timestamptz) to anon, authenticated, service_role;
grant execute on function public.current_is_suspended() to anon, authenticated, service_role;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.get_blocked_ids() to anon, authenticated;
