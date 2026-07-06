-- Admin moderation: soft-hide reported posts, suspend abusers, admin-only triage.
-- Gated to profiles.is_admin (set for @dev below). is_admin + is_suspended are
-- privileged columns frozen by guard_profile_privileged so a user cannot
-- self-grant admin or un-suspend themselves via a profile UPDATE.

-- 1. columns
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.posts add column if not exists hidden boolean not null default false;

-- 2. grant admin to @dev
update public.profiles set is_admin = true where username = 'dev';

-- 3. helpers (SECURITY DEFINER so they run cheaply inside RLS without recursing
--    through profiles' own policies). Reveal only the caller's own status.
create or replace function public.current_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin)
$$;

create or replace function public.current_is_suspended()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_suspended)
$$;

-- 4. freeze the two new privileged columns for direct client updates
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql set search_path = '' as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
    new.stripe_customer_id := old.stripe_customer_id;
    new.pro_until := old.pro_until;
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
  end if;
  return new;
end;
$function$;

-- 5. posts SELECT: hide soft-hidden posts from everyone except the author and admins
alter policy "posts visible by privacy" on public.posts
using (
  (auth.uid() is not null)
  and (
    (exists (select 1 from public.profiles p where p.id = posts.user_id and p.is_private = false))
    or (auth.uid() = user_id)
    or (exists (select 1 from public.follows f where f.following_id = posts.user_id and f.follower_id = auth.uid() and f.status = 'accepted'))
  )
  and (not posts.hidden or auth.uid() = posts.user_id or public.current_is_admin())
);

-- 6. block suspended users from creating content
alter policy "authed users create posts" on public.posts
with check (auth.uid() = user_id and not public.current_is_suspended());

alter policy "authed user create comment" on public.comments
with check (auth.uid() = user_id and not public.current_is_suspended());

alter policy "user follows user" on public.follows
with check (
  auth.uid() = follower_id
  and (status = 'pending' or not exists (
    select 1 from public.profiles where profiles.id = follows.following_id and profiles.is_private))
  and not public.current_is_suspended()
);

-- 7. admin action functions (each self-gates via current_is_admin)
create or replace function public.admin_list_reports()
returns table (
  report_id uuid, reason text, detail text, created_at timestamptz,
  post_id uuid, post_content text, post_hidden boolean,
  author_id uuid, author_username text, author_suspended boolean,
  reporter_username text
) language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  return query
  select r.id, r.reason, r.detail, r.created_at,
         p.id, p.content, p.hidden,
         au.id, au.username, au.is_suspended,
         ru.username
  from public.reports r
  join public.posts p on p.id = r.post_id
  join public.profiles au on au.id = p.user_id
  left join public.profiles ru on ru.id = r.reporter_id
  where r.status = 'open'
  order by r.created_at desc;
end $$;

create or replace function public.admin_hide_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.posts set hidden = true where id = p_post_id;
  update public.reports set status = 'resolved' where post_id = p_post_id and status = 'open';
end $$;

create or replace function public.admin_unhide_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.posts set hidden = false where id = p_post_id;
end $$;

create or replace function public.admin_resolve_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.reports set status = 'resolved' where id = p_report_id;
end $$;

create or replace function public.admin_suspend_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.profiles set is_suspended = true where id = p_user;
  update public.posts set hidden = true where user_id = p_user;
end $$;

create or replace function public.admin_unsuspend_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.profiles set is_suspended = false where id = p_user;
end $$;
