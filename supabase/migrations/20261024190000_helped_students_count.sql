-- Plan 019: "Helped N students" on the portfolio.
-- N = distinct other students whose Stuck post has one of this person's
-- comments as the accepted answer (posts.resolved_comment_id, plan 009).
-- Aggregate only: returns one integer, never post ids, authors, or content.
-- Same exposure rule as get_public_profile_counts
-- (20260711140000_public_profile_and_post.sql:68-69): a number is returned for
-- private accounts too. Returns 0 for a suspended helper, and 0 when the
-- signed-in viewer and the helper have a block between them.
-- Hidden posts (moderation or suspension, see
-- 20260722010000_selective_unsuspend_restore.sql:49) and suspended authors
-- never count. Self-accepted answers never count.
-- ponytail: counts live on every portfolio render with no cache; add a
-- partial index on posts(resolved_comment_id) where resolved_comment_id is not
-- null if this shows up in slow-query logs.

create or replace function public.helped_students_count(p_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.profiles h
      where h.id = p_profile_id and h.is_suspended = false
    ) then 0
    when auth.uid() is not null
      and p_profile_id in (select public.get_blocked_ids()) then 0
    else (
      select count(distinct po.user_id)::int
      from public.posts po
      join public.comments c on c.id = po.resolved_comment_id
      join public.profiles a on a.id = po.user_id
      where c.user_id = p_profile_id
        and po.context_label = 'stuck'
        and po.resolved_at is not null
        and po.user_id <> p_profile_id
        and not po.hidden
        and a.is_suspended = false
    )
  end;
$$;

revoke all on function public.helped_students_count(uuid) from public, anon, authenticated;
grant execute on function public.helped_students_count(uuid) to anon, authenticated;
