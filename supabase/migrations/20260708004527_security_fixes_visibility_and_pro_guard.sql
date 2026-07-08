-- Sec fix 1: comments + reactions could be inserted onto a post/repost the
-- writer cannot SELECT (private/hidden/blocked). Their INSERT with_check only
-- verified ownership + not-suspended, no visibility. reposts INSERT already had
-- its own public-author guard; comments/reactions had none. Mirror the SELECT
-- policies: posts/reposts RLS filters the EXISTS to rows visible to the caller,
-- so an EXISTS that returns a row == "caller can see this parent". Handle both
-- targets (post_id OR repost_id — either may be null for these tables).
alter policy "authed user create comment" on public.comments
  with check (
    auth.uid() = user_id
    and not public.current_is_suspended()
    and (
      (post_id is not null and exists (select 1 from public.posts p where p.id = post_id))
      or (repost_id is not null and exists (select 1 from public.reposts r where r.id = repost_id))
    )
  );

alter policy "user reacts to post" on public.reactions
  with check (
    auth.uid() = user_id
    and not public.current_is_suspended()
    and (
      (post_id is not null and exists (select 1 from public.posts p where p.id = post_id))
      or (repost_id is not null and exists (select 1 from public.reposts r where r.id = repost_id))
    )
  );

-- Sec fix 2: accent_color + avatar_is_animated are Pro-gated but were not frozen
-- by the privilege guard, so a non-Pro user could self-grant them with a direct
-- PostgREST profiles update, bypassing the app-layer Pro check (revenue leak).
-- These two DIFFER from the other frozen columns: the legit Pro path writes them
-- via the authenticated session client, so a flat freeze would break the real
-- feature. Freeze them only when the row is not Pro. is_pro is frozen first, so
-- a user cannot flip is_pro=true in the same statement to unlock them.
create or replace function public.guard_profile_privileged()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
    new.stripe_customer_id := old.stripe_customer_id;
    new.pro_until := old.pro_until;
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    if not coalesce(old.is_pro, false) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
    end if;
  end if;
  return new;
end;
$function$;
