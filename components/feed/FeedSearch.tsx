import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import { TEXT_LIMITS } from "@/lib/utils/validation";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

type SearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
};

async function searchProfiles(q: string): Promise<SearchResult[]> {
  const safe = q.replace(/[,()*%\\]/g, "").trim().slice(0, TEXT_LIMITS.searchQuery);
  const tokens = safe.split(/\s+/).filter(Boolean).slice(0, 5);
  if (!tokens.length) return [];

  // safe already stripped ,()*% and \, so tokens are clean for both ilike and array-literal syntax.
  const orFilter = tokens
    .flatMap((t) => [
      `username.ilike.%${t}%`,
      `display_name.ilike.%${t}%`,
      `major.ilike.%${t}%`,
      `skills.cs.{${t}}`,
      `courses.cs.{${t}}`,
    ])
    .join(",");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_pro, is_founder, is_campus_founder")
    .or(orFilter)
    .limit(20)
    .returns<SearchResult[]>();

  return data ?? [];
}

export function FeedSearchForm({ q, tab }: { q: string; tab: string }) {
  return (
    <form action="/feed" className="flex gap-2">
      {tab === "following" ? <input type="hidden" name="tab" value="following" /> : null}
      <input type="hidden" name="search" value="1" />
      <input
        name="q"
        defaultValue={q}
        maxLength={TEXT_LIMITS.searchQuery}
        placeholder="Search students by name, username, major, or skill"
        className={input}
      />
      <button type="submit" className="btn-primary shrink-0">
        Search
      </button>
    </form>
  );
}

export async function FeedSearchResults({ q }: { q: string }) {
  if (!q) return null;

  const results = await searchProfiles(q);

  if (results.length === 0) {
    return (
      <div className="card mt-4 px-6 py-10 text-center">
        <p className="font-medium text-[var(--ink)]">No students found</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          Nothing matched &ldquo;{q}&rdquo;. Try a different name, username, major, or skill.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-1.5">
      {results.map((p) => {
        const name = p.display_name ?? p.username;
        return (
          <li key={p.id}>
            <Link
              href={`/profile/${p.username}`}
              className="card card-hover flex items-center gap-2.5 px-3 py-2.5 active:scale-[0.99]"
            >
              {p.avatar_url ? (
                <AvatarImage
                  src={p.avatar_url}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                  pro={p.is_pro}
                />
              ) : (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 text-sm">
                <p className="flex flex-wrap items-center gap-x-1.5 font-medium">
                  {name}
                  <UserBadges isPro={p.is_pro} isFounder={p.is_founder} isCampusFounder={p.is_campus_founder} />
                </p>
                <p className="text-[var(--ink-muted)]">@{p.username}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
