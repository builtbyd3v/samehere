"use client";

import Link from "next/link";
import Menu from "@/components/ui/Menu";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import { signOut } from "@/app/(auth)/actions";

const itemClass = "block w-full px-3 py-1.5 text-left text-sm text-[var(--ink)] hover:bg-[var(--canvas)]";

// Avatar-triggered dropdown: Profile, Pro, Settings, Feedback, Log out.
// Client island so the rest of the navbar shell stays a server component.
export default function NavMenu({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  return (
    <Menu
      align="end"
      trigger={
        avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full border border-[var(--border)] object-cover" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-xs font-semibold text-[var(--ink-muted)]">
            {username.charAt(0).toUpperCase()}
          </span>
        )
      }
    >
      <Link href={`/profile/${username}`} className={itemClass}>
        Profile
      </Link>
      <Link href="/pro" className={itemClass}>
        Pro
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
