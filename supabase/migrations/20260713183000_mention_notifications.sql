-- @mentions render as links (lib/mentions.ts: /@([a-z0-9_]{3,20})/gi) but never
-- notified anyone. Add a 'mention' notification type + AFTER INSERT triggers on
-- posts/comments/reposts(quote_text) that extract @usernames with the SAME
-- charset/length regex, resolve to profiles, and reuse insert_notification()
-- (which already self-skips and both-direction block-skips) for the insert.
--
-- notifications also gains repost_id. Without it a mention written in a quote
-- repost's commentary (or in a comment on a quote) would notify with the ROOT
-- post's id, and the link would open /post/[id] -- a page where the mention
-- text does not appear. Quote commentary lives on /quote/[id]. reactions,
-- comments and bookmarks already carry a repost_id for exactly this reason;
-- notifications now matches that pattern.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'follow_request', 'comment', 'reaction', 'mention'));

alter table public.notifications
  add column if not exists repost_id uuid references public.reposts(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- insert_notification gains p_repost_id, APPENDED so every existing positional
-- caller (4 and 5 args, in follows_notify / comments_notify / reactions_notify)
-- keeps resolving correctly and picks up the default. The 5-arg version is
-- dropped afterwards: leaving both would make a 4-arg call ambiguous.
-- Body is otherwise verbatim (self-skip + both-direction block-skip).
-- ---------------------------------------------------------------------------
create or replace function public.insert_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_post_id uuid default null,
  p_reaction_type text default null,
  p_repost_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_user_id is null or p_actor_id is null or p_user_id = p_actor_id then
    return;
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_user_id and b.blocked_id = p_actor_id)
       or (b.blocker_id = p_actor_id and b.blocked_id = p_user_id)
  ) then
    return;
  end if;
  insert into public.notifications (user_id, type, actor_id, post_id, reaction_type, repost_id)
  values (p_user_id, p_type, p_actor_id, p_post_id, p_reaction_type, p_repost_id);
end;
$function$;

drop function if exists public.insert_notification(uuid, uuid, text, uuid, text);

-- Trigger-bound only (matches the prior ACL: postgres + service_role, no client roles).
revoke all on function public.insert_notification(uuid, uuid, text, uuid, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- list_notifications must surface repost_id so the client can route a quote
-- mention to /quote/[id]. RETURNS TABLE shape change => drop + create => the
-- ACL resets to EXECUTE-for-PUBLIC, so re-pin it to exactly what it had
-- (authenticated + service_role; no anon). Body otherwise verbatim.
-- ---------------------------------------------------------------------------
drop function if exists public.list_notifications(integer);

create function public.list_notifications(p_limit integer default 50)
returns table(id uuid, type text, post_id uuid, repost_id uuid, read boolean, created_at timestamptz,
              actor_id uuid, actor_username text, actor_display_name text, actor_avatar_url text,
              actor_is_pro boolean, reaction_type text)
language sql
stable
security definer
set search_path to ''
as $function$
  select
    n.id, n.type, n.post_id, n.repost_id, n.read, n.created_at,
    n.actor_id, p.username, p.display_name, p.avatar_url,
    public.is_pro_now(p.is_pro, p.pro_until),
    n.reaction_type
  from public.notifications n
  join public.profiles p on p.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$function$;

revoke all on function public.list_notifications(integer) from public, anon;
grant execute on function public.list_notifications(integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The mention extractor itself.
-- ---------------------------------------------------------------------------
create or replace function public.notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content text;
  v_post_id uuid;
  v_repost_id uuid;
  v_actor_id uuid;
  v_username text;
  v_target_id uuid;
begin
  if tg_table_name = 'posts' then
    v_content := new.content;
    v_post_id := new.id;
    v_repost_id := null;
    v_actor_id := new.user_id;
  elsif tg_table_name = 'comments' then
    v_content := new.content;
    v_actor_id := new.user_id;
    -- A comment on a quote lives at /quote/[repost_id], not on the root post.
    v_repost_id := new.repost_id;
    v_post_id := coalesce(new.post_id, (select rp.post_id from public.reposts rp where rp.id = new.repost_id));
  elsif tg_table_name = 'reposts' then
    if new.quote_text is null then
      return new;  -- a plain repost has no commentary to mention anyone in
    end if;
    v_content := new.quote_text;
    v_post_id := new.post_id;
    v_repost_id := new.id;
    v_actor_id := new.user_id;
  else
    return new;
  end if;

  if v_content is null then
    return new;
  end if;

  -- ponytail: a mention inside a PRIVATE author's post still notifies here;
  -- post-select RLS hides the content from anyone who can't see it, so the
  -- mentioned user's link 404s instead of leaking the private content.
  for v_username in
    select distinct lower(m[1])
    from regexp_matches(v_content, '@([a-z0-9_]{3,20})', 'gi') as m
  loop
    select p.id into v_target_id from public.profiles p where p.username = v_username;
    if v_target_id is null then
      continue;
    end if;

    if exists (
      select 1 from public.notifications n
      where n.user_id = v_target_id
        and n.actor_id = v_actor_id
        and n.post_id is not distinct from v_post_id
        and n.repost_id is not distinct from v_repost_id
        and n.type = 'mention'
    ) then
      continue;
    end if;

    perform public.insert_notification(v_target_id, v_actor_id, 'mention', v_post_id, null, v_repost_id);
  end loop;

  return new;
end;
$$;

revoke execute on function public.notify_mentions() from public, anon, authenticated;

drop trigger if exists posts_notify_mentions on public.posts;
create trigger posts_notify_mentions
  after insert on public.posts
  for each row execute function public.notify_mentions();

drop trigger if exists comments_notify_mentions on public.comments;
create trigger comments_notify_mentions
  after insert on public.comments
  for each row execute function public.notify_mentions();

drop trigger if exists reposts_notify_mentions on public.reposts;
create trigger reposts_notify_mentions
  after insert on public.reposts
  for each row execute function public.notify_mentions();

-- public.notifications is already in the supabase_realtime publication
-- (20260706130000_notifications_realtime.sql) -- navbar bell updates live, no
-- further change needed here.
