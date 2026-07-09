-- ============ Avatar-gate is_pro must consult pro_until (finding H3') ============
-- isPro() in the app now degrades to "Pro ends on time" when the nightly cron
-- misses a run: is_pro && (pro_until is null || pro_until > now()). These four
-- RPCs feed the AvatarImage animation gate (and Pro badges) a BARE is_pro, so a
-- lapsed subscriber whose flag hasn't been swept yet would still animate their
-- avatar — the render gate disagreeing with every UI surface. Apply the same
-- pro_until rule here so they can't disagree.
--
-- pro_until IS NULL = a comped/manual grant that never expires — preserved.
-- Bodies are byte-for-byte 20260710150000 except `coalesce(x.is_pro,false)` ->
-- `public.is_pro_now(x.is_pro, x.pro_until)` (defined in 20260711120050, the one
-- shared Pro-liveness rule). RETURNS TABLE shape is unchanged, so CREATE OR REPLACE
-- is enough (no drop, so grants are preserved and no re-grant boilerplate needed).

-- ============ list_notifications: actor_is_pro ============
create or replace function public.list_notifications(p_limit integer default 50)
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
    public.is_pro_now(p.is_pro, p.pro_until),
    n.reaction_type
  from public.notifications n
  join public.profiles p on p.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$function$;

-- ============ list_dm_inbox: peer_is_pro ============
create or replace function public.list_dm_inbox()
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
    public.is_pro_now(pr.is_pro, pr.pro_until),
    coalesce(lm.content, ''), coalesce(lm.created_at, c.updated_at), lm.sender_id,
    coalesce((select count(*)::bigint from public.messages m2 where m2.conversation_id = p.conversation_id
      and m2.sender_id = p.peer_id and (p.last_read_at is null or m2.created_at > p.last_read_at)), 0)
  from peers p
  join public.conversations c on c.id = p.conversation_id
  join public.profiles pr on pr.id = p.peer_id
  left join last_msgs lm on lm.conversation_id = p.conversation_id
  order by coalesce(lm.created_at, c.updated_at) desc nulls last;
$function$;

-- ============ get_profile_views: is_pro ============
create or replace function public.get_profile_views(p_profile uuid)
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
    select p.id, p.username, p.display_name, p.avatar_url,
      public.is_pro_now(p.is_pro, p.pro_until), pv.created_at
    from public.profile_views pv
    join public.profiles p on p.id = pv.viewer_id
    where pv.viewed_id = p_profile
    order by pv.created_at desc
    limit 50;
end;
$function$;

-- ============ get_dm_peer: peer_is_pro (DM thread header avatar) ============
create or replace function public.get_dm_peer(p_conversation_id uuid)
returns table(peer_id uuid, peer_username text, peer_display_name text, peer_avatar_url text, peer_is_pro boolean)
language sql
stable
security definer
set search_path = ''
as $function$
  select pr.id, pr.username, pr.display_name, pr.avatar_url,
    public.is_pro_now(pr.is_pro, pr.pro_until)
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
