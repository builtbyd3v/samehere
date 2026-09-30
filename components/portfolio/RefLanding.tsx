"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/** Fires ref_landing once per mount when a logged-out visitor arrives on a portfolio through a ?ref link. */
export default function RefLanding({ refCode }: { refCode: string }) {
  useEffect(() => {
    posthog.capture("ref_landing", { ref: refCode });
  }, [refCode]);
  return null;
}
