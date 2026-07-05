-- Anon-safe profile lookup for the shareable OG card. Mirrors get_public_heatmap's
-- privacy self-guard: returns a row ONLY for non-private profiles, so private
-- accounts leak nothing to unauthenticated OG crawlers. School omitted when hidden.
create or replace function public.get_public_profile_card(p_username text)
returns table(id uuid, display_name text, username text, avatar_url text,
              is_pro boolean, is_founder boolean, school text)
language sql security definer set search_path to '' as $function$
  select p.id, p.display_name, p.username, p.avatar_url, p.is_pro, p.is_founder,
         case when p.hide_school then null else ps.school end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username) and p.is_private = false;
$function$;

grant execute on function public.get_public_profile_card(text) to anon, authenticated;
