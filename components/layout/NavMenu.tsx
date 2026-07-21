"use client";

import Link from "next/link";
import posthog from "posthog-js";
import Menu, { useMenuClose } from "@/components/ui/Menu";
import AvatarBase from "@/components/ui/Avatar";
import FeedbackButton from "@/components/feedback/FeedbackButton";
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

function MenuItems({ isAdmin }: { isAdmin: boolean }) {
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
      {/* Saved is in the desktop left nav but NOT the mobile bottom bar, so it
          stays here on mobile only. Profile lives in both navs — dropped.
          Feedback is the same deal: it lives in the desktop left nav. */}
      <div className="lg:hidden">
        <MenuLink href="/saved">Saved</MenuLink>
        <FeedbackButton className={menuItemClass} />
      </div>
      <MenuLink href="/settings">Settings</MenuLink>
      {isAdmin && <MenuLink href="/admin">Admin</MenuLink>}
      <form
        action={async () => {
          posthog.capture("user_logged_out", {
            source: "nav_menu",
          });
          posthog.reset();
          await signOut();
        }}
      >
        <button type="submit" className={menuItemClass}>
          Log out
        </button>
      </form>
    </>
  );
}

export default function NavMenu({
  username,
  avatarUrl,
  isAdmin,
  isPro,
}: {
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isPro: boolean;
}) {
  return (
    <Menu
      align="end"
      variant="avatar"
      trigger={
        <AvatarBase src={avatarUrl} seed={username} name={username} className="h-full w-full text-xs" pro={isPro} />
      }
    >
      <MenuItems isAdmin={isAdmin} />
    </Menu>
  );
}
