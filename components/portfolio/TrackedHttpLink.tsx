"use client";

import { ExternalLink } from "lucide-react";
import { beaconMetric } from "@/lib/portfolio/metrics-client";

export default function TrackedHttpLink({
  href,
  children,
  projectId,
  clickKind,
}: {
  href: string;
  children: string;
  projectId: string;
  clickKind: "repo" | "demo";
}) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="inline-flex items-center gap-1 text-sm text-[var(--blue)] underline-offset-2 hover:underline"
      onClick={() => beaconMetric({ projectId, clickKind })}
    >
      {children}
      <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}
