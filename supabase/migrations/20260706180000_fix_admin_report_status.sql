-- reports.status CHECK allows only ('open','reviewed','dismissed'); the admin
-- functions used 'resolved' -> constraint violation (500 on hide/dismiss).
-- Hiding a post = action taken ('reviewed'); dismissing a report = 'dismissed'.
-- Both leave the open-reports list (admin_list_reports filters status='open').

create or replace function public.admin_hide_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.posts set hidden = true where id = p_post_id;
  update public.reports set status = 'reviewed' where post_id = p_post_id and status = 'open';
end $$;

create or replace function public.admin_resolve_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.reports set status = 'dismissed' where id = p_report_id;
end $$;
