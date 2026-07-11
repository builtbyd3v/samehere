-- Bugfix: DM/group chat bubbles need the sender's is_pro to render the Pro
-- ring + badge next to each message (matching club chat). get_group_conversation
-- (20260716140000_group_dms.sql) already returns the member roster for the
-- thread header -- extend it to also return member_is_pro so the page can
-- build a roster the client components use for per-bubble avatar/badge
-- lookup. Body copied verbatim from 20260716140000_group_dms.sql plus the
-- new column; security definer / search_path / membership gate unchanged.
--
-- Adding a column to RETURNS TABLE is a return-type change -- CREATE OR
-- REPLACE FUNCTION rejects that ("cannot change return type of existing
-- function"), so the old signature is dropped first. A fresh CREATE FUNCTION
-- grants EXECUTE to PUBLIC (which includes anon) by default; the explicit
-- revoke-from-public + grant-to-authenticated below (same as the original
-- migration) closes that back up.
drop function if exists public.get_group_conversation(uuid);

create function public.get_group_conversation(p_conversation_id uuid)
returns table (
  title text,
  member_id uuid,
  member_username text,
  member_display_name text,
  member_avatar_url text,
  member_is_pro boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select c.title, pr.id, pr.username, pr.display_name, pr.avatar_url, pr.is_pro
  from public.conversations c
  join public.conversation_members cm on cm.conversation_id = c.id and cm.left_at is null
  join public.profiles pr on pr.id = cm.user_id
  where c.id = p_conversation_id
    and c.kind = 'group'
    and public.is_conversation_member(p_conversation_id)
  order by pr.username;
$$;

revoke all on function public.get_group_conversation(uuid) from public;
grant execute on function public.get_group_conversation(uuid) to authenticated;
-- `revoke all from public` does NOT strip anon in this project -- Supabase
-- grants EXECUTE to anon/authenticated via schema-level default privileges,
-- not via PUBLIC. The fresh CREATE above re-opened anon EXECUTE, undoing
-- 20260716180000; name anon explicitly to re-close it (default-privileges trap).
revoke execute on function public.get_group_conversation(uuid) from anon;
