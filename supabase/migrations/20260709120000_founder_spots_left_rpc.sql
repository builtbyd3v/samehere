-- Public Founder-spots counter for the logged-out landing page.
-- Exposes ONLY the aggregate number of remaining Founder badges (first 100) —
-- no per-user data. SECURITY DEFINER so it can count past RLS; search_path pinned
-- per the project's hardening convention. Granted to anon because the landing is
-- rendered for logged-out visitors.
create or replace function public.get_founder_spots_left()
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select greatest(0, 100 - (select count(*)::int from public.profiles where is_founder));
$$;

grant execute on function public.get_founder_spots_left() to anon, authenticated;
