-- Security fixes: leaderboard privacy leak, connection point on non-mutual
-- follow, missing rate limiting, post-media storage read leak.

-- 1) Leaderboard: also exclude followers-only heatmap users (their activity is
-- not meant for public eyes). Preserves 20260705170000 signature/shape exactly.
create or replace function public.get_leaderboard(p_scope text, p_school text default null)
returns table(rank int, id uuid, username text, display_name text, avatar_url text,
              is_pro boolean, is_founder boolean, is_campus_founder boolean,
              accent_color text, school text, weekly_points bigint)
language plpgsql security definer set search_path to '' as $function$
declare
  v_viewer uuid := auth.uid();
  v_monday date := (date_trunc('week', (now() at time zone 'America/New_York')))::date;
begin
  if v_viewer is null then raise exception 'not authenticated'; end if;
  return query
  with pts as (
    select cl.user_id, sum(cl.points)::bigint wp
    from public.contribution_log cl
    where cl.date >= v_monday
    group by cl.user_id
  )
  select row_number() over (order by pts.wp desc, p.created_at asc)::int,
         p.id, p.username, p.display_name, p.avatar_url, p.is_pro, p.is_founder, p.is_campus_founder,
         p.accent_color,
         case when p.hide_school then null else ps.school end,
         pts.wp
  from pts
  join public.profiles p on p.id = pts.user_id
  left join public.profile_school ps on ps.profile_id = p.id
  where p.leaderboard_opt_out = false
    and p.heatmap_visibility <> 'followers'
    and (p_scope <> 'school' or ps.school = p_school)
  order by pts.wp desc, p.created_at asc
  limit 100;
end;
$function$;

-- 2) Connection point only on a MUTUAL accepted follow, not any accept.
-- request_follow: unchanged except the award condition (was: any accepted insert).
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
  v_mutual boolean;
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
    select exists (
      select 1 from public.follows
      where follower_id = p_target and following_id = v_me and status = 'accepted'
    ) into v_mutual;
    if v_mutual then
      perform public.log_contribution('connection', jsonb_build_object('with', p_target));
    end if;
  end if;
  return v_status;
end;
$function$;

-- accept_follow: verified against the live definition (its original CREATE was
-- applied outside migration history). Unchanged except the award now requires
-- the flip to make the follow mutual; silent no-op on no pending row preserved.
create or replace function public.accept_follow(p_follower uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_updated int;
  v_mutual boolean;
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  update public.follows
  set status = 'accepted'
  where follower_id = p_follower and following_id = v_me and status = 'pending';
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    select exists (
      select 1 from public.follows
      where follower_id = v_me and following_id = p_follower and status = 'accepted'
    ) into v_mutual;
    if v_mutual then
      perform public.log_contribution('connection', jsonb_build_object('with', p_follower));
    end if;
  end if;
end;
$function$;

grant execute on function public.accept_follow(uuid) to authenticated;

-- 3) Rate limiting (doc-promised, missing): coarse per-user window checks.
-- ponytail: coarse per-user window; real limiter only if abuse shows.
create or replace function public.rl_check_posts()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select count(*) from public.posts
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'rate limit: too many posts, slow down';
  end if;
  return new;
end;
$function$;

drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.rl_check_posts();

create or replace function public.rl_check_comments()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select count(*) from public.comments
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'rate limit: too many comments, slow down';
  end if;
  return new;
end;
$function$;

drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.rl_check_comments();

create or replace function public.rl_check_follows()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select count(*) from public.follows
      where follower_id = new.follower_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate limit: too many follows, slow down';
  end if;
  return new;
end;
$function$;

drop trigger if exists follows_rate_limit on public.follows;
create trigger follows_rate_limit
  before insert on public.follows
  for each row execute function public.rl_check_follows();

-- 4) post-media storage reads: gate on parent-post visibility instead of "any
-- authenticated user". Upload path = `{uploader auth.uid()}/{uuid}.{ext}`
-- (see components/feed/PostComposer.tsx), stored as an element of posts.media
-- jsonb (path/type), so match by unnesting media and comparing ->>'path' to the
-- object name. Visibility mirrors posts: author not private, OR viewer is the
-- author, OR an accepted follow exists (same rule as Security Requirements #6).
drop policy if exists "post-media authed select" on storage.objects;

create policy "post-media visibility select"
  on storage.objects for select
  using (
    bucket_id = 'post-media'
    and auth.uid() is not null
    and exists (
      select 1
      from public.posts p
      cross join lateral jsonb_array_elements(p.media) m
      join public.profiles au on au.id = p.user_id
      where m ->> 'path' = storage.objects.name
        and (
          au.is_private = false
          or p.user_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.following_id = p.user_id
              and f.follower_id = auth.uid()
              and f.status = 'accepted'
          )
        )
    )
  );
