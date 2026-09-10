import posthog from "posthog-js";

export function clientShouldTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl) return false;
  if (nav.doNotTrack === "1") return false;
  try {
    if (posthog.has_opted_out_capturing?.()) return false;
  } catch {
    // PostHog unset
  }
  return true;
}

export function beaconMetric(body: Record<string, string>): void {
  if (!clientShouldTrack()) return;
  try {
    navigator.sendBeacon(
      "/api/portfolio/metrics",
      new Blob([JSON.stringify(body)], { type: "application/json" })
    );
  } catch {
    // link / page still works
  }
}
