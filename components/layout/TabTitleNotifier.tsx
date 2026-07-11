"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Twitter-style unread badge on the browser tab title: prefixes the page's
// real title with "(3) " when there's unread activity, e.g. "(3) @alice ·
// samehere", and strips it back to the plain page title at zero. Seeded from
// the same server-computed total the navbar bell/inbox icons use (dm unread +
// notification unread) -- see TabTitleUnread in app/(app)/layout.tsx. A normal
// navigation/refresh re-fetches and re-seeds `initialTotal`. Between seeds,
// the Realtime subscription below re-fetches the true combined total on any
// notifications change (insert/update/delete), so the badge always reflects
// reality instead of drifting from a blind increment.
//
// PREFIX, not replace: keeps per-page context ("@alice · samehere") intact.
// A MutationObserver re-applies the badge whenever Next.js rewrites <title>
// from a page's metadata on intra-group navigation -- the (app) layout (and so
// this component) persists across those navigations, so `total` alone wouldn't
// re-fire the effect, and the badge would otherwise vanish after the first
// navigation.
function applyBadge(total: number) {
  const el = document.querySelector("title");
  if (!el) return;
  // Strip any "(N) " badge WE previously added to recover the page's real title.
  const base = document.title.replace(/^\(\d+\)\s*/, "");
  const desired = total > 0 ? `(${total}) ${base}` : base;
  // Only-if-different guard: our own set produces desired === current, so the
  // MutationObserver fired by this write no-ops instead of looping forever.
  if (document.title !== desired) document.title = desired;
}

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

  // Latest total for the observer callback to read without re-subscribing.
  const totalRef = useRef(total);
  totalRef.current = total;

  useEffect(() => {
    applyBadge(total);
  }, [total]);

  // Re-apply the badge when Next.js rewrites <title> on navigation/metadata
  // updates. applyBadge's "only if different" guard stops our own write from
  // triggering an endless observer loop.
  useEffect(() => {
    const el = document.querySelector("title");
    if (!el) return;
    const observer = new MutationObserver(() => applyBadge(totalRef.current));
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // Same Realtime pattern as NavIconBadge's bell (postgres_changes on
  // `notifications`, no filter needed -- RLS already scopes the broadcast to
  // this user's own rows). On ANY change (insert/update/delete) we debounce
  // and re-fetch the TRUE unread total -- the same two RPCs NavbarUnread uses
  // server-side (get_dm_unread_total + get_notification_unread_total) -- so
  // the badge goes back down when a notification is removed/read instead of
  // only ever climbing, and can't diverge from reality under spam.
  useEffect(() => {
    let active = true;
    const timer: { current: ReturnType<typeof setTimeout> | null } = { current: null };

    const refetchTotal = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const [{ data: dmUnread }, { data: notificationUnread }] = await Promise.all([
          supabase.rpc("get_dm_unread_total"),
          supabase.rpc("get_notification_unread_total"),
        ]);
        if (!active) return;
        setTotal(Number(dmUnread ?? 0) + Number(notificationUnread ?? 0));
      }, 500);
    };

    const channel = supabase
      .channel("tab-title-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        refetchTotal,
      )
      .subscribe();

    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return null;
}
