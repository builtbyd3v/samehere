"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Twitter-style unread badge on the browser tab title: prefixes the page's
// real title with "(3) " when there's unread activity, e.g. "(3) @alice ·
// samehere", and strips it back to the plain page title at zero. Seeded from
// the same server-computed total the navbar bell/inbox icons use (dm unread +
// notification unread) -- see TabTitleUnread in app/(app)/layout.tsx. A normal
// navigation/refresh re-fetches and re-seeds `initialTotal`, so the Realtime
// subscription below only needs to INCREMENT between seeds.
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
