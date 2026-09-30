-- Plan 009: close the Stuck loop.
-- 1. posts.resolved_at + posts.resolved_comment_id, only on stuck posts.
-- 2. Only the author sets them, through mark_stuck_resolved / reopen_stuck.
--    posts carries a table-level UPDATE grant for authenticated (see
--    20260714130000_threads.sql:16-18), so withholding a column grant would not
--    protect these columns. guard_post_context_label_only freezes them instead.
-- 3. stuck_help: in-app nudge to up to 3 matched helpers when a stuck post is
--    created. Trigger, same as every other notification insert.

alter table public.posts
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_comment_id uuid references public.comments(id) on delete set null;

-- "is not distinct from" matters: a plain "context_label = 'stuck'" is NULL for
-- unlabeled posts, and a CHECK that evaluates to NULL passes.
alter table public.posts drop constraint if exists posts_resolved_only_on_stuck;
alter table public.posts
  add constraint posts_resolved_only_on_stuck
  check (
    context_label is not distinct from 'stuck'
    or (resolved_at is null and resolved_comment_id is null)
  );

alter table public.posts drop constraint if exists posts_resolved_comment_needs_resolved;
alter table public.posts
  add constraint posts_resolved_comment_needs_resolved
  check (resolved_comment_id is null or resolved_at is not null);

-- Harmless if posts already has table-level SELECT; required if prod uses column grants.
grant select (resolved_at, resolved_comment_id) on public.posts to anon, authenticated;

-- ============================================================
-- guard_post_context_label_only: body copied from
-- 20260930100000_harden_profile_guard_suggestions_groups.sql; only the two
-- resolved_* freeze lines are new. create or replace keeps the trigger binding.
-- ============================================================
create or replace function public.guard_post_context_label_only()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.id := old.id;
    new.user_id := old.user_id;
    new.content := old.content;
    new.created_at := old.created_at;
    new.hidden := old.hidden;
    new.media := old.media;
    new.post_type := old.post_type;
    new.hidden_by_suspension := old.hidden_by_suspension;
    new.resolved_at := old.resolved_at;
    new.resolved_comment_id := old.resolved_comment_id;
  end if;
  return new;
end;
$function$;

revoke all on function public.guard_post_context_label_only() from public;

-- ============================================================
-- Author RPCs
-- ============================================================
create or replace function public.mark_stuck_resolved(p_post_id uuid, p_comment_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.posts p
    where p.id = p_post_id and p.user_id = auth.uid() and p.context_label = 'stuck'
  ) then
    raise exception 'only the author can resolve a stuck post';
  end if;
  if p_comment_id is not null and not exists (
    select 1 from public.comments c where c.id = p_comment_id and c.post_id = p_post_id
  ) then
    raise exception 'comment is not on this post';
  end if;
  update public.posts
     set resolved_at = coalesce(resolved_at, now()),
         resolved_comment_id = coalesce(p_comment_id, resolved_comment_id)
   where id = p_post_id;
end;
$$;

create or replace function public.reopen_stuck(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.posts p where p.id = p_post_id and p.user_id = auth.uid()
  ) then
    raise exception 'only the author can reopen a stuck post';
  end if;
  update public.posts set resolved_at = null, resolved_comment_id = null where id = p_post_id;
end;
$$;

revoke all on function public.mark_stuck_resolved(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reopen_stuck(uuid) from public, anon, authenticated;
grant execute on function public.mark_stuck_resolved(uuid, uuid) to authenticated;
grant execute on function public.reopen_stuck(uuid) to authenticated;

-- ============================================================
-- stuck_help notification type (list copied from
-- 20260720120000_referral_joined_notification.sql, 'stuck_help' appended)
-- ============================================================
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'follow_request', 'comment', 'reaction', 'mention', 'referral_joined', 'stuck_help'));

create or replace function public.notify_stuck_helpers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_focus text[];
  v_helper uuid;
begin
  -- A private or suspended author's post is not visible to strangers: skip.
  select p.focus_areas into v_focus
  from public.profiles p
  where p.id = new.user_id and p.is_private = false and p.is_suspended = false;
  if coalesce(array_length(v_focus, 1), 0) = 0 then
    return new;
  end if;

  -- ponytail: random pick among matches; rank by recent activity or year+1 later.
  for v_helper in
    select p.id
    from public.profiles p
    where p.id <> new.user_id
      and p.is_private = false
      and p.is_suspended = false
      and p.is_bot = false
      and p.open_to @> array['feedback']::text[]
      and p.focus_areas && v_focus
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = p.id and b.blocked_id = new.user_id)
           or (b.blocker_id = new.user_id and b.blocked_id = p.id)
      )
      and (
        select count(*) from public.notifications n
        where n.user_id = p.id
          and n.type = 'stuck_help'
          and n.created_at > now() - interval '24 hours'
      ) < 3
    order by random()
    limit 3
  loop
    perform public.insert_notification(v_helper, new.user_id, 'stuck_help', new.id);
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_stuck_helpers() from public, anon, authenticated;

drop trigger if exists posts_notify_stuck_helpers on public.posts;
create trigger posts_notify_stuck_helpers
  after insert on public.posts
  for each row
  when (new.context_label = 'stuck')
  execute function public.notify_stuck_helpers();

-- ============================================================
-- Author-only count used by the stuck_help_sent event
-- ============================================================
create or replace function public.stuck_help_count(p_post_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.notifications n
  where n.post_id = p_post_id
    and n.type = 'stuck_help'
    and exists (select 1 from public.posts p where p.id = p_post_id and p.user_id = auth.uid());
$$;

revoke all on function public.stuck_help_count(uuid) from public, anon, authenticated;
grant execute on function public.stuck_help_count(uuid) to authenticated;
