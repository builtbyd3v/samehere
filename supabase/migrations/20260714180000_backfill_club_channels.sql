-- Backfill: any club that predates clubs_v2 (created under the v1 single
-- clubs.conversation_id model) has no club_channels row and is unusable for
-- chat after 20260714160000 dropped that column. Give every channel-less club
-- a fresh 'general' everyone-channel + conversation.
--
-- The v1 conversation those clubs used was orphaned by the column drop (nothing
-- references it), so this creates a NEW empty general channel rather than
-- adopting the old conversation. Any messages in the old conversation are not
-- recovered here -- they were pre-launch test data.
do $$
declare r record; v_conv uuid;
begin
  for r in
    select c.id from public.clubs c
    where not exists (select 1 from public.club_channels ch where ch.club_id = c.id)
  loop
    insert into public.conversations (kind) values ('club') returning id into v_conv;
    insert into public.club_channels (club_id, name, min_role, conversation_id, is_general)
    values (r.id, 'general', 'everyone', v_conv, true);
  end loop;
end $$;
