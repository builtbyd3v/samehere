"use client";

import { formatMessageTime } from "@/lib/messages";

export default function MessageTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  return (
    <time className={className} dateTime={iso} suppressHydrationWarning>
      {formatMessageTime(iso)}
    </time>
  );
}
