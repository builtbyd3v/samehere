"use client";

import RouteError from "@/components/ui/RouteError";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} homeHref="/search" homeLabel="Back to search" />;
}
