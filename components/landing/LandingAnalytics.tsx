"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";

function LandingAnalyticsInner() {
  const hasRef = !!useSearchParams().get("ref");
  const firedRef = useRef(false);
  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      posthog.capture("landing_view", { has_ref: hasRef });
    }
  }, [hasRef]);
  return null;
}

// Fires landing_view once per landing-page mount. Wrapped in its own Suspense
// boundary so app/page.tsx (a static server component) doesn't need to
// provide one for useSearchParams.
export default function LandingAnalytics() {
  return (
    <Suspense fallback={null}>
      <LandingAnalyticsInner />
    </Suspense>
  );
}
