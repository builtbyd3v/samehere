"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";

// Makes the /messages inbox live. Subscribes to Realtime INSERTs on `messages`
// and refreshes the server component when one arrives, so the conversation list
// (preview text, ordering, unread dot) updates without a manual reload.
//
// No conversation filter: Realtime enforces the `messages` RLS SELECT policy,
// so the viewer only receives INSERTs for conversations they're a member of. A
// refresh re-runs `list_dm_inbox`, reusing the server-side aggregation instead
// of re-deriving unread/order/preview on the client.
// ponytail: router.refresh() over client re-aggregation; 250ms debounce coalesces bursts.
// Requires `messages` in the `supabase_realtime` publication (see *_messages_realtime.sql).
export default function MessageInboxRealtime() {
  const router = useRouter();
  const [supabase] = useState(getBrowserClient);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("dm-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 250);
        },
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null;
}
