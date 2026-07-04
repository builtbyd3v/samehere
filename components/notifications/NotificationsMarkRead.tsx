"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/app/(app)/notifications/actions";

export default function NotificationsMarkRead() {
  useEffect(() => {
    void markNotificationsRead();
  }, []);

  return null;
}
