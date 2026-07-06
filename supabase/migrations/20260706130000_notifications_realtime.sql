-- Enable Supabase Realtime for notifications so the navbar bell updates live
-- (NavIconBadge subscribes to postgres_changes INSERTs on this table). Realtime
-- enforces RLS; notifications SELECT is owner-only, so a subscriber only ever
-- receives their own rows — no filter needed on the client.
--
-- Idempotent: only add the table if it isn't already in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
