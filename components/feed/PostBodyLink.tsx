"use client";

import { useRouter } from "next/navigation";

/** Opens the post on click, but leaves nested <a> (e.g. @mentions) alone. */
export default function PostBodyLink({
  postId,
  children,
}: {
  postId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        router.push(`/post/${postId}`);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if ((e.target as HTMLElement).closest("a")) return;
        e.preventDefault();
        router.push(`/post/${postId}`);
      }}
      className="mt-3 block cursor-pointer hover:opacity-95"
    >
      {children}
    </div>
  );
}
