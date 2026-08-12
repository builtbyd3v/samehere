import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  AppEmptyState,
  AppPage,
  AppPageHeader,
  AppPanel,
} from "@/components/app/AppPrimitives";
import MessageInboxList from "@/components/messages/MessageInboxList";
import MessageInboxRealtime from "@/components/messages/MessageInboxRealtime";
import NewMessageFinder from "@/components/messages/NewMessageFinder";
import NewGroupButton from "@/components/messages/NewGroupButton";
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

  return (
    <AppPage width="medium">
      <AppPageHeader
        kicker="Helpers"
        title="Messages"
        description="Ask focused questions when someone at a target company has opted in to help."
      />

      {dmError || groupError ? (
        <AppEmptyState
          title="Couldn't load messages"
          description="The inbox request failed. Your conversations are still saved."
          action={
            <Link href="/messages" className="btn-ghost inline-flex">
              Try again
            </Link>
          }
        />
      ) : (
        <AppPanel className="overflow-hidden">
          <NewMessageFinder />
          <NewGroupButton />
          <MessageInboxList threads={threads} viewerId={user.id} />
          <MessageInboxRealtime />
        </AppPanel>
      )}
    </AppPage>
  );
}
