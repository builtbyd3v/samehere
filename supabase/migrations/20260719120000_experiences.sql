-- Task C1: public.experiences — student past internships/jobs/roles, feeds
-- profile display + AI people-search. Owner writes, any signed-in user reads
-- (mirrors bio visibility: no privacy tier on this table).

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('internship', 'job', 'research', 'club_role')),
  org text not null check (char_length(org) <= 80),
  role text not null check (char_length(role) <= 80),
  term text check (term is null or char_length(term) <= 40),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now()
);

alter table public.experiences enable row level security;

-- ============================================================
-- Cap 10 rows/user. Plain (non-definer) trigger fn: it runs as the calling
-- role, and the owner-scoped SELECT policy below already lets a user count
-- their own rows, so no privilege escalation is needed here — same shape as
-- rl_check_clubs (20260714140000_clubs.sql), minus SECURITY DEFINER.
-- ============================================================
create function public.experiences_cap()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if (select count(*) from public.experiences where user_id = new.user_id) >= 10 then
    raise exception 'limit: at most 10 experiences per user';
  end if;
  return new;
end;
$function$;

create trigger experiences_cap_trg
  before insert on public.experiences
  for each row execute function public.experiences_cap();

revoke all on function public.experiences_cap() from public;

-- ============================================================
-- RLS: owner ALL (insert/update/delete, auth.uid() = user_id both sides);
-- SELECT to any signed-in user (mirrors bio visibility).
-- ============================================================
create policy "experiences owner all" on public.experiences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "experiences read" on public.experiences
  for select to authenticated
  using (true);

revoke all on table public.experiences from anon;
grant select, insert, update, delete on table public.experiences to authenticated;
