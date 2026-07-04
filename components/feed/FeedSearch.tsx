import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

type SearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
};

async function searchProfiles(q: string): Promise<SearchResult[]> {
  const safe = q.replace(/[,()*%\\]/g, "").trim();
  const tokens = safe.split(/\s+/).filter(Boolean).slice(0, 5);
  if (!tokens.length) return [];

  const orFilter = tokens
    .flatMap((t) => [`username.ilike.%${t}%`, `display_name.ilike.%${t}%`])
    .join(",");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_pro, is_founder")
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
        placeholder="Search students by name or username"
        className={input}
        autoFocus
      />
      <button
        type="submit"
        className="btn-inset shrink-0 rounded-md bg-[var(--ink)] px-4 py-2.5 text-[15px] font-medium text-[var(--canvas)] transition active:opacity-80"
      >
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
      <p className="mt-4 text-center text-sm text-[var(--ink-muted)]">
        No students found for &ldquo;{q}&rdquo;.
      </p>
    );
  }

  return (
    <ul className="mt-4">
      {results.map((p) => {
        const name = p.display_name ?? p.username;
        return (
          <li key={p.id} className="border-b border-[var(--border)]">
            <Link
              href={`/profile/${p.username}`}
              className="flex items-center gap-2.5 px-1 py-3 hover:bg-[var(--surface)]"
            >
                    {p.avatar_url ? (
                      <AvatarImage
                        src={p.avatar_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                      />
                    ) : (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 text-sm">
                <p className="flex flex-wrap items-center gap-x-1.5 font-medium">
                  {name}
                  <UserBadges isPro={p.is_pro} isFounder={p.is_founder} />
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
