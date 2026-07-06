import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageInboxList from "@/components/messages/MessageInboxList";
import MessageInboxRealtime from "@/components/messages/MessageInboxRealtime";
import NewMessageFinder from "@/components/messages/NewMessageFinder";
import type { DmInboxRow } from "@/lib/messages";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: threads } = await supabase.rpc("list_dm_inbox");

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Messages</h1>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
        <NewMessageFinder />
        <MessageInboxList threads={(threads ?? []) as DmInboxRow[]} viewerId={user.id} />
        <MessageInboxRealtime />
      </section>
    </main>
  );
}
