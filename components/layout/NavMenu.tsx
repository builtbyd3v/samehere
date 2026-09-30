"use client";

import Link from "next/link";
import posthog from "posthog-js";
import Menu, { useMenuClose } from "@/components/ui/Menu";
import AvatarBase from "@/components/ui/Avatar";
import { StageDot } from "@/components/ui/Chip";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import { signOut } from "@/app/(auth)/actions";
import { STAGE_LABELS, parseStage } from "@/lib/stage";
import type { ShellUser } from "./LeftNav";

import { menuItemClass } from "@/lib/ui/menu-styles";
import ThemeToggle from "@/components/ui/ThemeToggle";

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
      {/* Saved is in both navs now. Feedback lives in the desktop left nav only,
          so it stays here on mobile. */}
      <div className="lg:hidden">
        <FeedbackButton className={menuItemClass} />
      </div>
      <div className="px-2 py-2">
        <ThemeToggle />
      </div>
      <MenuLink href="/settings">Settings</MenuLink>
      <MenuLink href="/pro">Pro</MenuLink>
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

export default function NavMenu({ user, variant }: { user: ShellUser; variant: "avatar" | "card" }) {
  const { username, displayName, avatarUrl, isPro, isAdmin } = user;
  if (!username) return null;
  const name = displayName ?? username;

  if (variant === "avatar") {
    return (
      <Menu
        align="start"
        label="Account menu"
        triggerClassName="grid size-11 place-items-center rounded-full active:scale-[0.94]"
        trigger={<AvatarBase src={avatarUrl} seed={username} name={name} className="size-[30px] rounded-full text-meta" pro={isPro} />}
      >
        <MenuItems isAdmin={isAdmin} />
      </Menu>
    );
  }

  const stage = parseStage(user.stage);
  return (
    <Menu
      align="start"
      placement="top"
      fullWidth
      label="Account menu"
      triggerClassName="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left hover:bg-[var(--fill-2)] active:scale-[0.98]"
      trigger={
        <>
          <AvatarBase src={avatarUrl} seed={username} name={name} className="size-8 shrink-0 rounded-full text-small" pro={isPro} />
          <span className="flex min-w-0 flex-col text-small leading-[1.3]">
            <span className="truncate font-medium text-[var(--ink)]">{name}</span>
            {stage ? (
              <span className="flex items-center gap-1.5 truncate text-[var(--muted)]">
                <StageDot stage={stage} />
                {STAGE_LABELS[stage]}
              </span>
            ) : (
              <span className="truncate text-[var(--muted)]">@{username}</span>
            )}
          </span>
        </>
      }
    >
      <MenuItems isAdmin={isAdmin} />
    </Menu>
  );
}
