import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageInboxList from "@/components/messages/MessageInboxList";
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
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Messages</h1>
        <Link href="/feed" className="text-sm text-[var(--ink-muted)] hover:underline">
          Feed
        </Link>
      </div>
      <NewMessageFinder />
      <MessageInboxList threads={(threads ?? []) as DmInboxRow[]} />
    </main>
  );
}
