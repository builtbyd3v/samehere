-- Pro metrics + section-order gates. Additive. Prepared locally only.
-- Root applies only to a disposable clone. Do not edit accepted portfolio/social migrations.
--
-- Close:
--   custom portfolio_settings.section_order insert/update requires current Pro
--     including pro_until; Free default inserts and publication-flag edits work;
--     saved custom order survives expiry.
--   get_public_portfolio rendered order falls back to canonical while expired.
--   owner SELECT portfolio_daily_metrics requires current Pro.
--   named-visitor RPC execute retired for anon/authenticated; historical rows kept.
--   service-only receipt table + atomic wrapper around increment_portfolio_daily_metric.

create function public.guard_portfolio_settings_section_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_default text[] := array['intro','projects','activity','experience','education','posts']::text[];
  v_pro boolean;
begin
  if TG_OP = 'UPDATE' and new.section_order is not distinct from old.section_order then
    return new;
  end if;
  if new.section_order is not distinct from v_default then
    return new;
  end if;
  select public.is_pro_now(p.is_pro, p.pro_until)
    into v_pro
  from public.profiles p
  where p.id = new.owner_id;
  if coalesce(v_pro, false) then
    return new;
  end if;
  raise exception 'section order requires pro';
end;
$$;

revoke all on function public.guard_portfolio_settings_section_order() from public;

create trigger guard_portfolio_settings_section_order
  before insert or update on public.portfolio_settings
  for each row execute function public.guard_portfolio_settings_section_order();

create or replace function public.get_public_portfolio(p_username text)
returns table (
  owner_id uuid,
  username text,
  is_private boolean,
  allow_indexing boolean,
  publish_intro boolean,
  publish_projects boolean,
  publish_activity boolean,
  publish_experience boolean,
  publish_education boolean,
  publish_posts boolean,
  activity_visible boolean,
  section_order text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.is_private,
    (not p.is_private) and coalesce(s.allow_indexing, false),
    (not p.is_private) and coalesce(s.publish_intro, false),
    (not p.is_private) and coalesce(s.publish_projects, false),
    (not p.is_private) and coalesce(s.publish_activity, false),
    (not p.is_private) and coalesce(s.publish_experience, false),
    (not p.is_private) and coalesce(s.publish_education, false),
    (not p.is_private) and coalesce(s.publish_posts, false),
    public.portfolio_activity_readable(p.id),
    case
      when public.is_pro_now(p.is_pro, p.pro_until)
        then coalesce(
          s.section_order,
          array['intro','projects','activity','experience','education','posts']::text[]
        )
      else array['intro','projects','activity','experience','education','posts']::text[]
    end
  from public.profiles p
  left join public.portfolio_settings s on s.owner_id = p.id
  where lower(p.username) = lower(p_username)
    and p.is_suspended = false
    and (
      auth.uid() is null
      or p.id not in (select public.get_blocked_ids())
    );
$$;

drop policy if exists "portfolio_daily_metrics owner select" on public.portfolio_daily_metrics;

create policy "portfolio_daily_metrics owner select" on public.portfolio_daily_metrics
  for select
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.profiles p
      where p.id = owner_id
        and public.is_pro_now(p.is_pro, p.pro_until)
    )
  );

revoke all on function public.record_profile_view(uuid) from public, anon, authenticated;
revoke all on function public.get_profile_views(uuid) from public, anon, authenticated;

create table private.portfolio_metric_receipts (
  session_hash text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.portfolio_projects(id) on delete cascade,
  kind text not null check (kind in ('view', 'click')),
  metric_date date not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint portfolio_metric_receipts_hash_ok check (session_hash ~ '^[0-9a-f]{64}$')
);

create unique index portfolio_metric_receipts_profile_day
  on private.portfolio_metric_receipts (session_hash, owner_id, kind, metric_date)
  where project_id is null;

create unique index portfolio_metric_receipts_project_day
  on private.portfolio_metric_receipts (session_hash, owner_id, project_id, kind, metric_date)
  where project_id is not null;

create index portfolio_metric_receipts_expires
  on private.portfolio_metric_receipts (expires_at);

alter table private.portfolio_metric_receipts enable row level security;
revoke all on table private.portfolio_metric_receipts from public, anon, authenticated;
grant all on table private.portfolio_metric_receipts to service_role;

create function public.record_portfolio_daily_metric_once(
  p_owner_id uuid,
  p_project_id uuid,
  p_kind text,
  p_viewer_id uuid,
  p_session_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (timezone('UTC', now()))::date;
  v_ok boolean;
begin
  if p_kind not in ('view', 'click')
     or p_owner_id is null
     or p_session_hash is null
     or p_session_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  if p_kind = 'view' and p_project_id is not null then
    return false;
  end if;
  if p_kind = 'click' and p_project_id is null then
    return false;
  end if;

  -- Bounded global expiry, not same-session only. Abandoned sessions otherwise stay forever.
  delete from private.portfolio_metric_receipts
  where ctid in (
    select ctid
    from private.portfolio_metric_receipts
    where expires_at < now()
    order by expires_at
    limit 64
  );

  begin
    insert into private.portfolio_metric_receipts (
      session_hash, owner_id, project_id, kind, metric_date, expires_at
    ) values (
      p_session_hash,
      p_owner_id,
      p_project_id,
      p_kind,
      v_today,
      timezone('UTC', now()) + interval '2 days'
    );
  exception when unique_violation then
    return false;
  end;

  v_ok := public.increment_portfolio_daily_metric(
    p_owner_id,
    p_project_id,
    p_kind,
    p_viewer_id
  );
  if not coalesce(v_ok, false) then
    delete from private.portfolio_metric_receipts
    where session_hash = p_session_hash
      and owner_id = p_owner_id
      and kind = p_kind
      and metric_date = v_today
      and project_id is not distinct from p_project_id;
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.record_portfolio_daily_metric_once(uuid, uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_portfolio_daily_metric_once(uuid, uuid, text, uuid, text)
  to service_role;
