import Link from "next/link";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import OpenToTags from "@/components/portfolio/OpenToTags";
import StudyModeChip from "@/components/portfolio/StudyModeChip";
import type { SearchPerson } from "@/lib/search";

export default function SearchPersonCard({ person }: { person: SearchPerson }) {
  const name = person.display_name ?? person.username;
  const meta = [person.year, person.major].filter(Boolean).join(" · ");
  return (
    <li className="card px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <Link href={`/profile/${person.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <AvatarBase
            src={person.avatar_url}
            seed={person.username}
            name={name}
            className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
            pro={person.is_pro}
          />
          <div className="min-w-0 text-sm">
            <p className="flex flex-wrap items-center gap-x-1.5 font-medium">
              {name}
              <UserBadges
                isPro={person.is_pro}
                isFounder={person.is_founder}
                isCampusFounder={person.is_campus_founder}
                isVerifiedStudent={person.verified_student}
              />
            </p>
            <p className="text-[var(--ink-muted)]">@{person.username}</p>
            {meta ? <p className="truncate text-xs text-[var(--ink-faint)]">{meta}</p> : null}
          </div>
        </Link>
        <StudyModeChip mode={person.study_mode} />
      </div>
      <OpenToTags tags={person.open_to ?? []} username={person.username} linkToDm />
    </li>
  );
}
