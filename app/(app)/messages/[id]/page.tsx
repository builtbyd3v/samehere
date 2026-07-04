import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageComposer from "@/components/messages/MessageComposer";
import MessageThread, { MessageThreadHeader } from "@/components/messages/MessageThread";
import type { DmMessage } from "@/lib/messages";

type MessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

type PeerRow = {
  peer_id: string;
  peer_username: string;
  peer_display_name: string | null;
  peer_avatar_url: string | null;
};

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: peerRows } = await supabase.rpc("get_dm_peer", { p_conversation_id: id });
  const peer = (peerRows as PeerRow[] | null)?.[0];
  if (!peer) notFound();

  const { data: messageRows } = await supabase
    .from("messages")
    .select(
      "id, sender_id, content, created_at, sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url)",
    )
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200)
    .returns<MessageRow[]>();

  await supabase.rpc("mark_dm_read", { p_conversation_id: id });

  const displayName = peer.peer_display_name ?? peer.peer_username;
  const messages: DmMessage[] = (messageRows ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    sender: m.sender,
  }));

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-2xl flex-col">
      <MessageThreadHeader
        username={peer.peer_username}
        displayName={displayName}
        avatarUrl={peer.peer_avatar_url}
      />
      <div className="flex-1 overflow-y-auto bg-[var(--canvas)]">
        <MessageThread messages={messages} viewerId={user.id} />
      </div>
      <MessageComposer conversationId={id} />
    </main>
  );
}
