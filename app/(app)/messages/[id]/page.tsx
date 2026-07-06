import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageComposer from "@/components/messages/MessageComposer";
import MessageMarkRead from "@/components/messages/MessageMarkRead";
import MessageThreadLive from "@/components/messages/MessageThreadLive";
import { MessageThreadHeader } from "@/components/messages/MessageThread";
import type { DmMessage } from "@/lib/messages";

type MessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
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

  const [{ data: peerRows }, { data: messageRows }] = await Promise.all([
    supabase.rpc("get_dm_peer", { p_conversation_id: id }),
    supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200)
      .returns<MessageRow[]>(),
  ]);

  const peer = (peerRows as PeerRow[] | null)?.[0];
  if (!peer) notFound();

  const displayName = peer.peer_display_name ?? peer.peer_username;
  const messages: DmMessage[] = (messageRows ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    sender: null,
  }));

  return (
    <main className="page-enter mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-4 py-4 sm:px-5 sm:py-6">
      <MessageMarkRead conversationId={id} />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
        <MessageThreadHeader
          username={peer.peer_username}
          displayName={displayName}
          avatarUrl={peer.peer_avatar_url}
        />
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--canvas)]">
          <MessageThreadLive conversationId={id} initialMessages={messages} viewerId={user.id} />
        </div>
        <MessageComposer conversationId={id} />
      </section>
    </main>
  );
}
