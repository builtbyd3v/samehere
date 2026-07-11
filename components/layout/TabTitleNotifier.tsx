"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BASE_TITLE = "samehere";

// Twitter-style unread badge on the browser tab title: "(3) samehere" when
// there's unread activity, plain "samehere" otherwise. Seeded from the same
// server-computed total the navbar bell/inbox icons use (dm unread +
// notification unread) -- see TabTitleUnread in app/(app)/layout.tsx. A
// normal navigation/refresh re-fetches and re-seeds `initialTotal`, so the
// Realtime subscription below only needs to INCREMENT between seeds.
export default function TabTitleNotifier({ initialTotal }: { initialTotal: number }) {
  const [total, setTotal] = useState(initialTotal);
  // Resync whenever the server-provided total changes (fresh page load),
  // mirroring NavIconBadge's prevCount pattern -- without fighting the
  // realtime bump below.
  const [prevTotal, setPrevTotal] = useState(initialTotal);
  if (initialTotal !== prevTotal) {
    setPrevTotal(initialTotal);
    setTotal(initialTotal);
  }
  const [supabase] = useState(createClient);

  useEffect(() => {
    document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;
  }, [total]);

  // Same Realtime pattern as NavIconBadge's bell (postgres_changes on
  // `notifications`, no filter needed -- RLS already scopes the broadcast to
  // this user's own rows). DM unread isn't wired here; notifications alone
  // covers v1.
  useEffect(() => {
    const channel = supabase
      .channel("tab-title-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => setTotal((t) => t + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return null;
}
