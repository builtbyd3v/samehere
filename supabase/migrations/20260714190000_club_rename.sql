-- Renaming a club must update its slug so the route /community/clubs/[slug]
-- follows the name. slug is frozen against clients by guard_clubs_privileged,
-- so rename goes through this SECURITY DEFINER function (runs as the function
-- owner, not 'authenticated', so the guard's freeze branch doesn't apply).
--
-- Owner-only. Keeps both uniqueness constraints satisfied: lower(name) unique
-- and slug unique. The slug is derived from the name; if that base slug is
-- too short (<3, the slug CHECK floor) or already taken by another club, a
-- short suffix from the club id disambiguates.

create function public.club_rename(p_club uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text := public.club_role(p_club);
  v_base text;
  v_slug text;
  v_suffix text := substr(replace(p_club::text, '-', ''), 1, 4);
begin
  if v_role is distinct from 'owner' then
    raise exception 'not authorized';
  end if;
  if char_length(coalesce(p_name, '')) < 2 or char_length(p_name) > 60 then
    raise exception 'name must be 2-60 characters';
  end if;

  -- slugify: lowercase, non-alphanumerics -> '-', trim leading/trailing '-'.
  v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));

  -- Guarantee the slug CHECK (^[a-z0-9-]{3,40}$) and uniqueness. Use the base
  -- alone when it is long enough and free; otherwise append the id suffix.
  if char_length(v_base) >= 3
     and not exists (select 1 from public.clubs where slug = v_base and id <> p_club) then
    v_slug := v_base;
  else
    v_slug := left(v_base, 35);
    if char_length(v_slug) > 0 then
      v_slug := v_slug || '-' || v_suffix;
    else
      v_slug := 'club-' || v_suffix;
    end if;
  end if;

  -- name uniqueness (lower(name)) and slug uniqueness are enforced by indexes;
  -- a collision raises unique_violation, surfaced to the caller.
  update public.clubs set name = p_name, slug = v_slug where id = p_club;

  return v_slug;
end;
$function$;

revoke all on function public.club_rename(uuid, text) from public;
revoke all on function public.club_rename(uuid, text) from anon;
grant execute on function public.club_rename(uuid, text) to authenticated;
