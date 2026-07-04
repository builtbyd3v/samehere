"use client";

import { useRouter } from "next/navigation";

/** Opens the quote repost on click, but leaves nested <a> (e.g. @mentions) alone. */
export default function QuoteBodyLink({
  quoteId,
  children,
  className = "mt-2 block cursor-pointer hover:opacity-95",
}: {
  quoteId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        router.push(`/quote/${quoteId}`);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if ((e.target as HTMLElement).closest("a")) return;
        e.preventDefault();
        router.push(`/quote/${quoteId}`);
      }}
      className={className}
    >
      {children}
    </div>
  );
}
