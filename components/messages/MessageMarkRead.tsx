"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markDmRead } from "@/app/(app)/messages/actions";

export default function MessageMarkRead({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    void markDmRead(conversationId).then(() => router.refresh());
  }, [conversationId, router]);

  return null;
}
