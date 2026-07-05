-- Two insert_notification overloads existed: a 4-arg (uuid,uuid,text,uuid) from the
-- notifications migration and a 5-arg superset (uuid,uuid,text,uuid,text) from the
-- reaction-labels migration that adds reaction_type. A 4-arg call (the follow/comment
-- notify triggers) matched BOTH — the 5-arg via its default last arg — raising
--   function public.insert_notification(uuid, uuid, unknown, unknown) is not unique
-- That aborted the follows/comments INSERT inside request_follow, so following a user
-- silently failed (the client swallowed the RPC error). Drop the redundant 4-arg
-- overload; 4-arg callers now bind to the superset with p_reaction_type => NULL.
drop function if exists public.insert_notification(uuid, uuid, text, uuid);
