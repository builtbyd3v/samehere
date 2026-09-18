import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AvatarBase from "@/components/ui/Avatar";
import FollowButton from "@/components/profile/FollowButton";
import UserBadges from "@/components/profile/UserBadges";

function yearMajorLine(year: string | null, major: string | null): string | null {
  if (year && major) return `${year} · ${major}`;
  return year ?? major ?? null;
}

// Idle /search (no query) — first "Find people" landing. Right-rail suggestions
// are xl-only, so mobile would otherwise hit a blank EmptyState. Same RPC as
// RightRail; no AI, no schema.
export default async function SearchIdlePeople() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("get_suggested_profiles", { p_limit: 8 });
  const suggested = data ?? [];
  if (suggested.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">People you should meet</h2>
      <ul className="flex flex-col gap-2">
        {suggested.map((p) => {
          const name = p.display_name ?? p.username;
          const line = yearMajorLine(p.year, p.major);
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
            >
              <AvatarBase
                src={p.avatar_url}
                seed={p.username}
                name={name}
                className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
                pro={p.is_pro}
              />
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-x-1.5">
                  <Link href={`/profile/${p.username}`} className="truncate font-medium hover:underline">
                    {name}
                  </Link>
                  <UserBadges
                    isPro={p.is_pro}
                    isFounder={p.is_founder}
                    isCampusFounder={p.is_campus_founder}
                    isVerifiedStudent={p.verified_student}
                  />
                </div>
                {line && <p className="truncate text-xs text-[var(--ink-muted)]">{line}</p>}
              </div>
              <FollowButton targetId={p.id} initial="none" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
