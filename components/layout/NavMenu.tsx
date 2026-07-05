"use client";

import { useState } from "react";
import Link from "next/link";
import Menu, { useMenuClose } from "@/components/ui/Menu";
import AvatarImage from "@/components/ui/AvatarImage";
import { FeedbackModal } from "@/components/feedback/FeedbackButton";
import { signOut } from "@/app/(auth)/actions";

import { menuItemClass } from "@/lib/ui/menu-styles";

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  const close = useMenuClose();
  return (
    <Link href={href} className={menuItemClass} onClick={() => close?.()}>
      {children}
    </Link>
  );
}

function MenuItems({
  username,
  onFeedback,
}: {
  username: string;
  onFeedback: () => void;
}) {
  const close = useMenuClose();

  return (
    <>
      <Link
        href="/referrals"
        onClick={() => close?.()}
        className="mb-1 flex flex-col gap-0.5 rounded-md border border-[var(--border-strong)] bg-[var(--featured-surface)] px-3 py-2 transition active:scale-[0.98]"
      >
        <span className="text-sm font-medium text-[var(--ink)]">Invite friends</span>
        <span className="text-xs text-[var(--ink-muted)]">Share your link, race to 100</span>
      </Link>
      <MenuLink href={`/profile/${username}`}>Profile</MenuLink>
      <MenuLink href="/saved">Saved</MenuLink>
      <MenuLink href="/settings">Settings</MenuLink>
      <button
        type="button"
        className={menuItemClass}
        onClick={() => {
          close?.();
          onFeedback();
        }}
      >
        Feedback
      </button>
      <form action={signOut}>
        <button type="submit" className={menuItemClass}>
          Log out
        </button>
      </form>
    </>
  );
}

export default function NavMenu({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <Menu
        align="end"
        variant="avatar"
        trigger={
          avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center bg-[var(--featured-surface)] text-xs font-semibold text-[var(--ink-muted)]">
              {username.charAt(0).toUpperCase()}
            </span>
          )
        }
      >
        <MenuItems username={username} onFeedback={() => setFeedbackOpen(true)} />
      </Menu>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
