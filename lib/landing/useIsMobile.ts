"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True below the `md` breakpoint (768px). useSyncExternalStore keeps
 * hydration consistent: the server snapshot (true, the mobile-first baseline)
 * is used during hydration, then the real matchMedia value applies without a
 * mismatch error. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(QUERY).matches,
    () => true,
  );
}
