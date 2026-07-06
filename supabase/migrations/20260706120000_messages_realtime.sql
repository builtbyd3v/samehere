-- Enable Supabase Realtime for direct messages so an open thread updates live
-- (MessageThreadLive subscribes to postgres_changes INSERTs on this table).
-- Realtime still enforces RLS, so a subscriber only receives messages in
-- conversations they're already allowed to SELECT.
--
-- Idempotent: only add the table if it isn't already in the publication, so
-- re-running (or running after the dashboard toggle) is a no-op.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
