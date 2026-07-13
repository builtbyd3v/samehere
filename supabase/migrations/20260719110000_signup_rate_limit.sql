-- DB-backed signup rate limit (Supabase Auth's own limiter is the only thing
-- guarding this today). Coarse per-IP window, same shape as rl_check_posts/
-- comments/follows (20260705190000_security_fixes.sql): count recent rows,
-- reject over threshold, else record the attempt.
--
-- signup runs pre-auth, so the caller is the anon role — table itself stays
-- fully locked down (RLS on, no policies, all grants revoked) and every
-- read/write goes through the definer fn.
create table public.signup_attempts (
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index signup_attempts_ip_hash_created_at_idx
  on public.signup_attempts (ip_hash, created_at);

alter table public.signup_attempts enable row level security;

revoke all on public.signup_attempts from public, anon, authenticated;

create or replace function public.rl_check_signup(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- opportunistic cleanup, cheap given the (ip_hash, created_at) index
  delete from public.signup_attempts where created_at < now() - interval '24 hours';

  if (select count(*) from public.signup_attempts
      where ip_hash = p_ip_hash and created_at > now() - interval '60 minutes') >= 5 then
    return false;
  end if;

  insert into public.signup_attempts (ip_hash) values (p_ip_hash);
  return true;
end;
$function$;

revoke execute on function public.rl_check_signup(text) from public, authenticated;
grant execute on function public.rl_check_signup(text) to anon, authenticated;
