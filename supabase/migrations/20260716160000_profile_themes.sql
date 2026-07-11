-- Curated profile themes (Pro), plan 023.
--
-- A theme is a fixed preset (see lib/themes.ts PROFILE_THEMES) -- NOT a
-- free-form color editor, which would be a CSS-injection surface. The user
-- stores only an enum KEY here; the DB CHECK below is the allowlist, same
-- defense pattern as profiles_accent_color_hex (20260704120000) constraining
-- accent_color to a 6-digit hex. Rendering (app layer) maps key -> pre-baked
-- safe CSS variables -- never raw user-supplied color/CSS.
--
-- Pro-gating (is_pro check) stays an app-layer concern here too, mirroring
-- accent_color/banner_url/avatar_is_animated: the DB only enforces the
-- allowlist shape, not who may write it. profile/edit/actions.ts is the
-- actual gate (same isPro() branch that already guards accent_color).
--
-- Precedence vs accent_color: a theme SETS the accent when present (theme
-- wins); accent_color is the manual escape hatch used only when
-- profile_theme IS NULL. Enforced at render time in
-- app/(app)/profile/[username]/page.tsx, not here.
alter table public.profiles
  add column if not exists profile_theme text;

alter table public.profiles
  add constraint profiles_profile_theme_allowed
  check (profile_theme is null or profile_theme in ('ember', 'ocean', 'violet', 'forest', 'rose', 'slate'));

-- Column-scoped SELECT grant: 20260711150000 revoked the blanket profiles
-- SELECT from authenticated/anon and grants an explicit column list instead
-- (the "profiles column-grants trap" -- a new column is invisible to every
-- logged-in query, 42501, until it's granted here). Mirrors accent_color's
-- grant in that same migration. Only `authenticated` needs it: the anon
-- (logged-out) profile view reads through the get_public_profile()
-- SECURITY DEFINER function, which bypasses column ACLs and does not
-- (yet) surface profile_theme -- out of scope for this round.
grant select (profile_theme) on public.profiles to authenticated;
