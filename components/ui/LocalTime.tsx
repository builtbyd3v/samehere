"use client";

import { formatNotificationTime } from "@/lib/notifications";
import { formatMessageTime } from "@/lib/messages";
import { timeAgo } from "@/lib/time";

const FORMAT = { ago: timeAgo, notification: formatNotificationTime, message: formatMessageTime } as const;

export default function LocalTime({
  iso,
  variant = "ago",
  className,
}: {
  iso: string;
  variant?: keyof typeof FORMAT;
  className?: string;
}) {
  return (
    <time className={className} dateTime={iso} suppressHydrationWarning>
      {FORMAT[variant](iso)}
    </time>
  );
}
