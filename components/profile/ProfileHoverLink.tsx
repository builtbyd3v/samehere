"use client";

import Link from "next/link";
import ProfileHoverTarget from "./ProfileHoverTarget";

export default function ProfileHoverLink({
  username,
  href,
  className,
  children,
}: {
  username: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ProfileHoverTarget username={username}>
      <Link href={href} className={className}>
        {children}
      </Link>
    </ProfileHoverTarget>
  );
}
