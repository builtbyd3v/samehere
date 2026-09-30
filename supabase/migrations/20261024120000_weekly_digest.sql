-- Plan 018: weekly digest recipients and content, one row per opted-in user.
--
-- Returns, per confirmed, non-suspended user who has not opted out
-- (profiles.email_digest_opt_out = false):
--   people    up to 3 newcomers (joined in the last 7 days) at the same stage,
--             newest first. Skips private, suspended, and bot accounts, people the
--             recipient already follows, and blocks in either direction.
--   questions up to 2 open Stuck posts (unresolved, not hidden, last 7 days) from
--             public, non-suspended authors sharing a focus area, newest first.
--             Skips blocks in either direction and posts the recipient already
--             commented on. Excerpt is 141 chars so the caller knows when to cut.
--   views_7d  profile-level portfolio views in the last 7 days, only for users
--             who are Pro right now (view analytics are a Pro feature), else null.
--
-- No stage means no people; no focus areas means no questions. No ranking or
-- scoring beyond newest first.
--
-- Service-role only: called by app/api/cron/weekly-digest/route.ts through the
-- admin client. Execute is revoked from every client role and never granted.

create or replace function public.list_weekly_digest()
returns table (
  user_id uuid,
  email text,
  people jsonb,
  questions jsonb,
  views_7d int
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    r.id,
    u.email,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('username', x.username, 'display_name', x.display_name, 'stage', x.stage)
        order by x.created_at desc, x.id
      )
      from (
        select p.id, p.username, p.display_name, p.stage, p.created_at
        from public.profiles p
        where p.stage = r.stage
          and p.id <> r.id
          and p.is_private = false
          and p.is_suspended = false
          and p.is_bot = false
          and p.created_at > now() - interval '7 days'
          and not exists (
            select 1 from public.follows f
            where f.follower_id = r.id and f.following_id = p.id
          )
          and not exists (
            select 1 from public.blocks b
            where (b.blocker_id = r.id and b.blocked_id = p.id)
               or (b.blocker_id = p.id and b.blocked_id = r.id)
          )
        order by p.created_at desc, p.id
        limit 3
      ) x
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object('id', q.id, 'excerpt', q.excerpt, 'username', q.username, 'display_name', q.display_name)
        order by q.created_at desc, q.id
      )
      from (
        select po.id, left(po.content, 141) as excerpt, a.username, a.display_name, po.created_at
        from public.posts po
        join public.profiles a on a.id = po.user_id
        where po.context_label = 'stuck'
          and po.resolved_at is null
          and po.hidden = false
          and po.created_at > now() - interval '7 days'
          and po.user_id <> r.id
          and a.is_private = false
          and a.is_suspended = false
          and a.focus_areas && r.focus_areas
          and not exists (
            select 1 from public.blocks b
            where (b.blocker_id = r.id and b.blocked_id = a.id)
               or (b.blocker_id = a.id and b.blocked_id = r.id)
          )
          and not exists (
            select 1 from public.comments c
            where c.post_id = po.id and c.user_id = r.id
          )
        order by po.created_at desc, po.id
        limit 2
      ) q
    ), '[]'::jsonb),
    case when public.is_pro_now(r.is_pro, r.pro_until) then (
      select coalesce(sum(m.view_count), 0)::int
      from public.portfolio_daily_metrics m
      where m.owner_id = r.id
        and m.project_id is null
        and m.metric_date > current_date - 7
    ) end
  from public.profiles r
  join auth.users u on u.id = r.id
  where r.email_digest_opt_out = false
    and r.is_suspended = false
    and u.email_confirmed_at is not null;
$$;

-- Service-role only (cron route via the admin client). No grant.
revoke all on function public.list_weekly_digest() from public, anon, authenticated;
