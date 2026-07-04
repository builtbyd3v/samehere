"use client";

import { useEffect, useRef } from "react";

export default function MessageScrollArea({
  messageCount,
  children,
}: {
  messageCount: number;
  children: React.ReactNode;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messageCount]);

  return (
    <>
      {children}
      <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
    </>
  );
}
