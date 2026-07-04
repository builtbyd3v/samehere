-- Pro perks foundation (v1): profile accent color + animated avatar flag,
-- and profile-view tracking for the future Pro "who viewed your profile".
-- Pro-gating (is_pro check) is an app-layer concern, not enforced in SQL here.

-- accent_color renders straight into a CSS var/style, so it MUST be
-- format-constrained to a 6-digit hex or NULL to prevent CSS injection.
alter table public.profiles
  add column if not exists accent_color text,
  add column if not exists avatar_is_animated boolean not null default false;

alter table public.profiles
  add constraint profiles_accent_color_hex
  check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$');

-- Unique-pair viewer log: primary key (viewer_id, viewed_id) means a re-view
-- upserts created_at instead of appending a row.
-- ponytail: bounds row growth, gives "recent unique viewers" only — no
-- per-visit history; add a history table only if per-visit analytics needed.
create table if not exists public.profile_views (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, viewed_id)
);
alter table public.profile_views enable row level security;
-- No policies: reached only through the definer functions below.

-- Read path is `where viewed_id = x order by created_at desc` (every owner
-- profile load); PK leads on viewer_id so it can't serve that. Index the hot path.
create index if not exists profile_views_viewed_idx
  on public.profile_views (viewed_id, created_at desc);

create or replace function public.record_profile_view(p_viewed uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if auth.uid() = p_viewed then
    return;
  end if;
  insert into public.profile_views (viewer_id, viewed_id)
  values (auth.uid(), p_viewed)
  on conflict (viewer_id, viewed_id)
  do update set created_at = now();
end;
$$;
revoke all on function public.record_profile_view(uuid) from public;
grant execute on function public.record_profile_view(uuid) to authenticated;

-- Owner-only: you only see your own viewers. This is the privacy floor;
-- the Pro gate (is_pro) itself lives in the app layer, not here.
create or replace function public.get_profile_views(p_profile uuid)
returns table(id uuid, username text, display_name text, avatar_url text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() != p_profile then
    return;
  end if;
  return query
    select p.id, p.username, p.display_name, p.avatar_url, pv.created_at
    from public.profile_views pv
    join public.profiles p on p.id = pv.viewer_id
    where pv.viewed_id = p_profile
    order by pv.created_at desc
    limit 50;
end;
$$;
revoke all on function public.get_profile_views(uuid) from public;
grant execute on function public.get_profile_views(uuid) to authenticated;
