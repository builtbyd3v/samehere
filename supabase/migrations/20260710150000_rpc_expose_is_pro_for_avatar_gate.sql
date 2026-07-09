-- Animated avatars are a Pro perk, but AvatarImage decided whether to animate
-- from the file extension alone, never from is_pro. A lapsed subscriber kept an
-- animated avatar everywhere. The render gate needs the avatar owner's is_pro,
-- and these three RPCs were the only avatar sources that didn't expose it.
--
-- RETURNS TABLE can't be widened by CREATE OR REPLACE, so each is dropped and
-- recreated. That RESETS grants to the default (EXECUTE to PUBLIC, which would
-- hand anon access to signed-in-only data), so every function re-revokes PUBLIC
-- and anon and re-grants exactly the roles it had before:
--   postgres=X | authenticated=X | service_role=X
--
-- Bodies are otherwise byte-for-byte the originals, including `search_path = ''`.

-- ============ list_notifications: actor_is_pro ============
drop function if exists public.list_notifications(integer);

create function public.list_notifications(p_limit integer default 50)
returns table(
  id uuid, type text, post_id uuid, read boolean, created_at timestamptz,
  actor_id uuid, actor_username text, actor_display_name text,
  actor_avatar_url text, actor_is_pro boolean, reaction_type text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    n.id, n.type, n.post_id, n.read, n.created_at,
    n.actor_id, p.username, p.display_name, p.avatar_url,
    coalesce(p.is_pro, false), n.reaction_type
  from public.notifications n
  join public.profiles p on p.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$function$;

revoke all on function public.list_notifications(integer) from public, anon;
grant execute on function public.list_notifications(integer) to authenticated, service_role;

-- ============ list_dm_inbox: peer_is_pro ============
drop function if exists public.list_dm_inbox();

create function public.list_dm_inbox()
returns table(
  conversation_id uuid, peer_id uuid, peer_username text, peer_display_name text,
  peer_avatar_url text, peer_is_pro boolean, last_message text,
  last_message_at timestamptz, last_sender_id uuid, unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  with my_convs as (
    select cm.conversation_id, cm.last_read_at from public.conversation_members cm where cm.user_id = auth.uid()
  ),
  peers as (
    select mc.conversation_id, mc.last_read_at, cm2.user_id as peer_id
    from my_convs mc
    join public.conversation_members cm2 on cm2.conversation_id = mc.conversation_id and cm2.user_id <> auth.uid()
    where not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = cm2.user_id)
         or (b.blocker_id = cm2.user_id and b.blocked_id = auth.uid())
    )
  ),
  last_msgs as (
    select distinct on (m.conversation_id) m.conversation_id, m.content, m.created_at, m.sender_id
    from public.messages m join peers p on p.conversation_id = m.conversation_id
    order by m.conversation_id, m.created_at desc
  )
  select p.conversation_id, p.peer_id, pr.username, pr.display_name, pr.avatar_url,
    coalesce(pr.is_pro, false),
    coalesce(lm.content, ''), coalesce(lm.created_at, c.updated_at), lm.sender_id,
    coalesce((select count(*)::bigint from public.messages m2 where m2.conversation_id = p.conversation_id
      and m2.sender_id = p.peer_id and (p.last_read_at is null or m2.created_at > p.last_read_at)), 0)
  from peers p
  join public.conversations c on c.id = p.conversation_id
  join public.profiles pr on pr.id = p.peer_id
  left join last_msgs lm on lm.conversation_id = p.conversation_id
  order by coalesce(lm.created_at, c.updated_at) desc nulls last;
$function$;

revoke all on function public.list_dm_inbox() from public, anon;
grant execute on function public.list_dm_inbox() to authenticated, service_role;

-- ============ get_profile_views: is_pro ============
drop function if exists public.get_profile_views(uuid);

create function public.get_profile_views(p_profile uuid)
returns table(id uuid, username text, display_name text, avatar_url text, is_pro boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- owner-only, unchanged
  if auth.uid() is null or auth.uid() != p_profile then
    return;
  end if;
  return query
    select p.id, p.username, p.display_name, p.avatar_url, coalesce(p.is_pro, false), pv.created_at
    from public.profile_views pv
    join public.profiles p on p.id = pv.viewer_id
    where pv.viewed_id = p_profile
    order by pv.created_at desc
    limit 50;
end;
$function$;

revoke all on function public.get_profile_views(uuid) from public, anon;
grant execute on function public.get_profile_views(uuid) to authenticated, service_role;

-- ============ get_dm_peer: peer_is_pro (DM thread header avatar) ============
drop function if exists public.get_dm_peer(uuid);

create function public.get_dm_peer(p_conversation_id uuid)
returns table(peer_id uuid, peer_username text, peer_display_name text, peer_avatar_url text, peer_is_pro boolean)
language sql
stable
security definer
set search_path = ''
as $function$
  select pr.id, pr.username, pr.display_name, pr.avatar_url, coalesce(pr.is_pro, false)
  from public.conversation_members cm
  join public.profiles pr on pr.id = cm.user_id
  where cm.conversation_id = p_conversation_id
    and cm.user_id <> auth.uid()
    and public.is_conversation_member(p_conversation_id)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = cm.user_id)
         or (b.blocker_id = cm.user_id and b.blocked_id = auth.uid())
    )
  limit 1;
$function$;

revoke all on function public.get_dm_peer(uuid) from public, anon;
grant execute on function public.get_dm_peer(uuid) to authenticated, service_role;
