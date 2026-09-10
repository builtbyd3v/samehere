import Link from "next/link";
import AvatarBase from "@/components/ui/Avatar";
import UserBadges from "@/components/profile/UserBadges";
import FollowButton from "@/components/profile/FollowButton";
import type { MatchSignal } from "@/lib/match";

export type SuggestedProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  year: string | null;
  major: string | null;
  goals: string | null;
  bio: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
  profile_school: { school: string | null } | null;
};

function SuggestedCard({ s, i }: { s: SuggestedProfile; i: number }) {
  const name = s.display_name ?? s.username;
  const line = s.year && s.major ? `${s.year} · ${s.major}` : (s.year ?? s.major ?? null);
  return (
    <div
      className="cascade-up flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
      style={{ "--delay": `${i * 80}ms` } as React.CSSProperties}
    >
      <AvatarBase
        src={s.avatar_url}
        seed={s.username}
        name={name}
        className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
        pro={s.is_pro}
      />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-1.5">
          <Link href={`/profile/${s.username}`} className="font-medium hover:underline">
            {name}
          </Link>
          <UserBadges isPro={s.is_pro} isFounder={s.is_founder} isCampusFounder={s.is_campus_founder} isVerifiedStudent={s.verified_student} />
          <span className="text-[var(--ink-muted)]">@{s.username}</span>
        </div>
        {line && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{line}</p>}
      </div>
      <FollowButton targetId={s.id} initial="none" />
    </div>
  );
}

export function SuggestedFollowsFallback({ suggested }: { suggested: SuggestedProfile[] }) {
  return (
    <div className="flex flex-col gap-2">
      {suggested.map((s, i) => (
        <SuggestedCard key={s.id} s={s} i={i} />
      ))}
    </div>
  );
}

export default async function SuggestedFollows({
  suggested,
}: {
  userId?: string;
  viewerSignal?: MatchSignal;
  viewerPro?: boolean;
  suggested: SuggestedProfile[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {suggested.map((s, i) => (
        <SuggestedCard key={s.id} s={s} i={i} />
      ))}
    </div>
  );
}
