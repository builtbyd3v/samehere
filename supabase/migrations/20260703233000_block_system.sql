-- block_user: block a user, wipe follows both ways
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

  -- ponytail: block also nukes pending+accepted follows both ways
  delete from public.follows
  where (follower_id = v_me and following_id = target)
     or (follower_id = target and following_id = v_me);
end;
$function$;

grant execute on function public.block_user(uuid) to authenticated;

-- get_blocked_ids: ids blocked in either direction with the caller; empty for anon
create or replace function public.get_blocked_ids()
returns setof uuid
language sql
security definer
set search_path to ''
as $function$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid();
$function$;

grant execute on function public.get_blocked_ids() to authenticated;

-- request_follow: add block guard, otherwise unchanged from prior definition
create or replace function public.request_follow(p_target uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_private boolean;
  v_status text;
  v_inserted int;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_me = p_target then raise exception 'cannot follow yourself'; end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_me and blocked_id = p_target)
       or (blocker_id = p_target and blocked_id = v_me)
  ) then
    raise exception 'cannot follow a blocked user';
  end if;

  select is_private into v_private from public.profiles where id = p_target;
  if not found then raise exception 'no such user'; end if;

  v_status := case when v_private then 'pending' else 'accepted' end;
  insert into public.follows (follower_id, following_id, status)
  values (v_me, p_target, v_status)
  on conflict (follower_id, following_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 and v_status = 'accepted' then
    perform public.log_contribution('connection', jsonb_build_object('with', p_target));
  end if;
  return v_status;
end;
$function$;
