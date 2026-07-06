"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type Props = {
  distinctId: string;
  email?: string | null;
  username?: string | null;
};

export default function PostHogUserIdentification({ distinctId, email, username }: Props) {
  useEffect(() => {
    posthog.identify(distinctId, {
      email: email ?? undefined,
      username: username ?? undefined,
    });
  }, [distinctId, email, username]);

  return null;
}
