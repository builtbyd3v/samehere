import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageInboxList from "@/components/messages/MessageInboxList";
import MessageInboxRealtime from "@/components/messages/MessageInboxRealtime";
import NewMessageFinder from "@/components/messages/NewMessageFinder";
import NewGroupButton from "@/components/messages/NewGroupButton";
import type { DmInboxRow, GroupInboxRow, InboxThread } from "@/lib/messages";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: dmThreads }, { data: groupThreads }] = await Promise.all([
    supabase.rpc("list_dm_inbox"),
    supabase.rpc("list_group_inbox"),
  ]);

  const threads: InboxThread[] = [
    ...((dmThreads ?? []) as DmInboxRow[]).map((t) => ({ kind: "dm" as const, ...t })),
    ...((groupThreads ?? []) as GroupInboxRow[]).map((t) => ({ kind: "group" as const, ...t })),
  ].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Messages</h1>

      <section className="card overflow-hidden">
        <NewMessageFinder />
        <NewGroupButton />
        <MessageInboxList threads={threads} viewerId={user.id} />
        <MessageInboxRealtime />
      </section>
    </main>
  );
}
