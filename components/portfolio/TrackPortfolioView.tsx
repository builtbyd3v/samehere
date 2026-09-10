"use client";

import { useEffect } from "react";
import { beaconMetric } from "@/lib/portfolio/metrics-client";

export default function TrackPortfolioView({ username }: { username: string }) {
  useEffect(() => {
    beaconMetric({ username });
  }, [username]);
  return null;
}
