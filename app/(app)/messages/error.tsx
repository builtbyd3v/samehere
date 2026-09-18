"use client";

import RouteError from "@/components/ui/RouteError";

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} homeHref="/messages" homeLabel="Back to messages" />;
}
