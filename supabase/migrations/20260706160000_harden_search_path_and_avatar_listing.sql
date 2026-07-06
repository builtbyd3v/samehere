-- Pin search_path on the privileged-column guard (defends the is_pro/is_founder/
-- stripe guard against a search_path swap). Body uses no unqualified objects.
alter function public.guard_profile_privileged() set search_path = '';

-- avatars is a public bucket: images load via the public CDN URL regardless of
-- RLS, so this SELECT policy only governs the list/enumerate API. Scope it to
-- authenticated so anon can't enumerate avatar object names.
alter policy "avatars public read" on storage.objects to authenticated;
