-- Rate limits for abuse-prone tables not yet covered by
-- 20260705190000_security_fixes.sql (rl_check_posts/comments/follows).
-- Same coarse per-user window pattern, mirrored exactly.
-- ponytail: coarse per-user window check.

create or replace function public.rl_check_messages()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate limit: too many messages, slow down';
  end if;
  return new;
end;
$function$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.rl_check_messages();

create or replace function public.rl_check_reactions()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select count(*) from public.reactions
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate limit: too many reactions, slow down';
  end if;
  return new;
end;
$function$;

drop trigger if exists reactions_rate_limit on public.reactions;
create trigger reactions_rate_limit
  before insert on public.reactions
  for each row execute function public.rl_check_reactions();

create or replace function public.rl_check_reports()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'rate limit: too many reports, slow down';
  end if;
  return new;
end;
$function$;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.rl_check_reports();

create or replace function public.rl_check_feedback()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'rate limit: too many feedback submissions, slow down';
  end if;
  return new;
end;
$function$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.rl_check_feedback();

revoke execute on function public.rl_check_messages() from public, anon, authenticated;
revoke execute on function public.rl_check_reactions() from public, anon, authenticated;
revoke execute on function public.rl_check_reports() from public, anon, authenticated;
revoke execute on function public.rl_check_feedback() from public, anon, authenticated;
