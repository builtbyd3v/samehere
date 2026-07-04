import Link from "next/link";
import { parseMentions } from "@/lib/mentions";

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
          <Link
            key={`${p.username}-${i}`}
            href={`/profile/${p.username}`}
            className="text-[var(--blue)] hover:underline"
          >
            @{p.username}
          </Link>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}
