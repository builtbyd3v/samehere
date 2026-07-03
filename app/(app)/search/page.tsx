import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

type SearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim();
  // Strip PostgREST filter metacharacters — prevents .or() grammar injection.
  // ponytail: ILIKE scan; add a pg_trgm index if it slows. School search deferred
  // (school lives in RLS'd profile_school).
  const safe = q.replace(/[,()*%\\]/g, "").trim();

  const supabase = await createClient();
  const { data: results } = safe
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
        .limit(20)
        .returns<SearchResult[]>()
    : { data: [] as SearchResult[] };

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em]">Search</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search students by name or username"
          className={input}
        />
        <button
          type="submit"
          className="btn-inset shrink-0 rounded-md bg-[var(--ink)] px-4 py-2.5 text-[15px] font-medium text-[var(--canvas)] transition active:opacity-80"
        >
          Search
        </button>
      </form>

      <section className="mt-6">
        {!q ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            Search students by name or username.
          </p>
        ) : !results || results.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            No students found for &ldquo;{q}&rdquo;.
          </p>
        ) : (
          <ul>
            {results.map((p) => {
              const name = p.display_name ?? p.username;
              return (
                <li key={p.id} className="border-b border-[var(--border)]">
                  <Link
                    href={`/profile/${p.username}`}
                    className="flex items-center gap-2.5 px-1 py-3 hover:bg-[var(--surface)]"
                  >
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
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
                      <p className="font-medium">{name}</p>
                      <p className="text-[var(--ink-muted)]">@{p.username}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
