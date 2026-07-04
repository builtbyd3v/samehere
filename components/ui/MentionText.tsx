"use client";

import Link from "next/link";
import { parseMentions } from "@/lib/mentions";
import ProfileHoverTarget from "@/components/profile/ProfileHoverTarget";

export default function MentionText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const parts = parseMentions(children);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "mention" ? (
          <ProfileHoverTarget key={`${p.username}-${i}`} username={p.username}>
            <Link
              href={`/profile/${p.username}`}
              className="text-[var(--blue)] hover:underline"
            >
              @{p.username}
            </Link>
          </ProfileHoverTarget>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}
