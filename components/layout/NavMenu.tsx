"use client";

import Link from "next/link";
import Menu from "@/components/ui/Menu";
import AvatarImage from "@/components/ui/AvatarImage";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import { signOut } from "@/app/(auth)/actions";

const itemClass = "block w-full px-3 py-1.5 text-left text-sm text-[var(--ink)] hover:bg-[var(--canvas)]";

// Avatar-triggered dropdown: Profile, Saved, Settings, Feedback, Log out.
// Client island so the rest of the navbar shell stays a server component.
export default function NavMenu({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  return (
    <Menu
      align="end"
      variant="avatar"
      trigger={
        avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-[var(--surface)] text-xs font-semibold text-[var(--ink-muted)]">
            {username.charAt(0).toUpperCase()}
          </span>
        )
      }
    >
      <Link href={`/profile/${username}`} className={itemClass}>
        Profile
      </Link>
      <Link href="/saved" className={itemClass}>
        Saved
      </Link>
      <Link href="/settings" className={itemClass}>
        Settings
      </Link>
      <FeedbackButton className={itemClass} />
      <form action={signOut}>
        <button type="submit" className={itemClass}>
          Log out
        </button>
      </form>
    </Menu>
  );
}
