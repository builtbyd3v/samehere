import Link from "next/link";
import AvatarImage from "@/components/ui/AvatarImage";
import UserBadges from "@/components/profile/UserBadges";
import type { ProfilePreview } from "@/lib/profile-preview";

const YEAR: Record<string, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad student",
};

export default function ProfilePreviewCard({
  profile,
  popover = false,
}: {
  profile: ProfilePreview;
  popover?: boolean;
}) {
  const name = profile.display_name ?? profile.username;
  const school = profile.profile_school?.school ?? null;
  // Max one middle-dot per line: first item gets the dot separator, any
  // further items are comma-joined after it.
  const metaParts = [school, profile.year ? YEAR[profile.year] : null, profile.major].filter(Boolean);
  const meta = metaParts.length <= 1 ? metaParts[0] ?? "" : `${metaParts[0]} · ${metaParts.slice(1).join(", ")}`;

  const className = `card block w-[min(300px,calc(100vw-2rem))] p-4 shadow-lg ${
    popover ? "motion-safe:[animation:menu-pop_150ms_ease-out]" : "transition hover:bg-[var(--featured-surface)]"
  }`;

  const inner = (
    <>
      <div className="flex gap-3">
        {profile.avatar_url ? (
          <AvatarImage
            src={profile.avatar_url}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border border-[var(--border)] object-cover"
            pro={profile.is_pro}
          />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--featured-surface)] text-sm font-semibold text-[var(--ink-muted)]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-semibold text-[var(--ink)]">{name}</span>
            <UserBadges isPro={profile.is_pro} isFounder={profile.is_founder} isCampusFounder={profile.is_campus_founder} isVerifiedStudent={profile.verified_student} />
          </div>
          <p className="text-sm text-[var(--ink-muted)]">@{profile.username}</p>
        </div>
      </div>
      {meta && <p className="mt-2 text-xs text-[var(--ink-muted)]">{meta}</p>}
      {profile.bio && (
        <p className="mt-2 line-clamp-2 text-sm leading-snug text-[var(--ink)]">{profile.bio}</p>
      )}
    </>
  );

  return (
    <Link href={`/profile/${profile.username}`} className={className}>
      {inner}
    </Link>
  );
}
