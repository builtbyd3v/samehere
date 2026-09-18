"use client";

import type { ReactNode } from "react";
import { beaconMetric } from "@/lib/portfolio/metrics-client";

export default function TrackedHttpLink({
  href,
  children,
  projectId,
  clickKind,
  className = "inline-flex items-center gap-1 text-sm text-[var(--blue)] underline-offset-2 hover:underline",
}: {
  href: string;
  children: ReactNode;
  projectId: string;
  clickKind: "repo" | "demo";
  className?: string;
}) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className={className}
      onClick={() => beaconMetric({ projectId, clickKind })}
    >
      {children}
    </a>
  );
}
