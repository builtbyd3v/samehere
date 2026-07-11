"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push-actions";

// Web Push needs the VAPID public key as a raw Uint8Array, not the
// base64url string it's distributed as.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushToggle({ initialSubscribed }: { initialSubscribed: boolean }) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("Push isn't configured yet.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications are blocked. Enable them in your browser settings.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Subscription failed.");

      const { error: saveError } = await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (saveError) throw new Error(saveError);

      posthog.capture("push_optin");
      setSubscribed(true);
    } catch (e) {
      console.error("[push] enable failed", e);
      // iOS only allows web push for a PWA added to the Home Screen -- a very
      // likely cause of failure on iPhone/iPad when not installed that way.
      const nav = navigator as Navigator & { standalone?: boolean };
      const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
      if (isIOS && nav.standalone === false) {
        setError("On iPhone/iPad, add samehere to your Home Screen first, then enable push.");
      } else {
        const reason = e instanceof Error ? e.message : String(e);
        setError(`Could not enable push notifications: ${reason}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await registration?.pushManager.getSubscription();
      await sub?.unsubscribe();
      await unsubscribeFromPush();
      setSubscribed(false);
    } catch (e) {
      console.error("[push] disable failed", e);
      const reason = e instanceof Error ? e.message : String(e);
      setError(`Could not disable push notifications: ${reason}`);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <p className="text-sm text-[var(--ink-muted)]">Push notifications aren&apos;t supported in this browser.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-muted)]">
          Get notified on this device for follows, comments, and reactions.
        </p>
        <button
          type="button"
          onClick={subscribed ? disable : enable}
          disabled={busy}
          className="btn-inset shrink-0 rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80 disabled:opacity-50"
        >
          {busy ? "Working…" : subscribed ? "Disable" : "Enable"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--ink-muted)]">{error}</p>}
    </div>
  );
}
