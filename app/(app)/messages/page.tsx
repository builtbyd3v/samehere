import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageInboxList from "@/components/messages/MessageInboxList";
import MessageInboxRealtime from "@/components/messages/MessageInboxRealtime";
import NewMessageFinder from "@/components/messages/NewMessageFinder";
import NewGroupButton from "@/components/messages/NewGroupButton";
import EmptyState from "@/components/ui/EmptyState";
import { CTA, messages as messagesCopy } from "@/lib/copy-voice";
import type { DmInboxRow, GroupInboxRow, InboxThread } from "@/lib/messages";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ?to=<username> deep link (jobs peers panel, weekly-matches email "Say
  // hi" CTA) -- resolve to a DM and redirect straight into it. Mirrors
  // startDmWithUsername's exact RPC args/redirect target
  // (app/(app)/messages/actions.ts) so both entry points land the same way.
  // Unresolvable/self username falls through to the normal inbox render.
  const { to } = await searchParams;
  if (to && to.trim()) {
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", to.trim())
      .maybeSingle();

    if (targetProfile && targetProfile.id !== user.id) {
      const { data: conversationId, error } = await supabase.rpc("get_or_create_dm", {
        p_recipient: targetProfile.id,
      });
      if (!error && conversationId) redirect(`/messages/${conversationId}`);
    }
  }

  const [{ data: dmThreads, error: dmError }, { data: groupThreads, error: groupError }] = await Promise.all([
    supabase.rpc("list_dm_inbox"),
    supabase.rpc("list_group_inbox"),
  ]);
  if (dmError) console.error("list_dm_inbox failed:", dmError.message);
  if (groupError) console.error("list_group_inbox failed:", groupError.message);

  const threads: InboxThread[] = [
    ...((dmThreads ?? []) as DmInboxRow[]).map((t) => ({ kind: "dm" as const, ...t })),
    ...((groupThreads ?? []) as GroupInboxRow[]).map((t) => ({ kind: "group" as const, ...t })),
  ].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));

  const loadFailed = Boolean(dmError || groupError);

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Messages</h1>

      {loadFailed ? (
        <EmptyState
          title={messagesCopy.inboxLoadFailed.title}
          description={messagesCopy.inboxLoadFailed.description}
          action={{ label: CTA.tryAgain, href: "/messages" }}
          secondaryAction={{ label: CTA.seeLatest, href: "/feed" }}
        />
      ) : threads.length === 0 ? (
        <div className="space-y-3">
          <section className="card overflow-hidden">
            <NewMessageFinder />
            <NewGroupButton />
          </section>
          <EmptyState
            title={messagesCopy.inboxEmpty.title}
            description={messagesCopy.inboxEmpty.description}
            action={{ label: CTA.findPeople, href: "/search" }}
            secondaryAction={{ label: CTA.seeLatest, href: "/feed" }}
          />
          {/* Keep the empty inbox live too: a viewer's first-ever DM must swap this
              empty state for the thread list without a manual reload. */}
          <MessageInboxRealtime />
        </div>
      ) : (
        <section className="card overflow-hidden">
          <NewMessageFinder />
          <NewGroupButton />
          <MessageInboxList threads={threads} viewerId={user.id} />
          <MessageInboxRealtime />
        </section>
      )}
    </main>
  );
}
