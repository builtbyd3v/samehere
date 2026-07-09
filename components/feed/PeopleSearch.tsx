"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { peopleSearch, type PeopleSearchState } from "@/app/(app)/feed/actions";
import UserBadges from "@/components/profile/UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";
import { TEXT_LIMITS } from "@/lib/utils/validation";

// Persistent feed search with two modes: keyword (server-rendered, free,
// unlimited — passed in as `keyword`) and smart natural-language AI search
// (metered: 1/day free, Pro unlimited). Smart results render client-side.
const inputCls =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

function tab(active: boolean): string {
  return `rounded-full px-2.5 py-1 font-medium transition ${
    active
      ? "bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)]"
      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
  }`;
}

export default function PeopleSearch({ keyword, isPro = false }: { keyword: ReactNode; isPro?: boolean }) {
  const [smart, setSmart] = useState(false);
  const [q, setQ] = useState("");
  const [state, setState] = useState<PeopleSearchState>({});
  const [pending, startTransition] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    startTransition(async () => {
      setState(await peopleSearch(query));
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-xs">
        <button type="button" onClick={() => setSmart(false)} className={tab(!smart)}>
          Keyword
        </button>
        <button type="button" onClick={() => setSmart(true)} className={tab(smart)}>
          ✦ Smart
        </button>
      </div>

      {smart ? (
        <>
          <form onSubmit={run} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={TEXT_LIMITS.searchQuery}
              placeholder="Describe who you want to meet, like CS juniors into ML"
              className={inputCls}
            />
            <button type="submit" disabled={pending} className="btn-primary shrink-0">
              {pending ? "…" : "Search"}
            </button>
          </form>
          <p className="mt-1.5 text-xs text-[var(--ink-faint)]">
            AI finds students that fit your description.{isPro ? " Unlimited on Pro." : " Free searches: 1 a day."}
          </p>

          {state.error && <p className="mt-2 text-sm text-[var(--danger)]">{state.error}</p>}

          {state.overCap && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm">
              <p className="text-[var(--ink)]">You&apos;ve used today&apos;s free smart search.</p>
              <Link href="/pro" className="mt-1 inline-block text-[var(--ink-muted)] underline">
                Go Pro for unlimited
              </Link>
            </div>
          )}

          {state.empty && (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              No students matched. Try describing it a different way.
            </p>
          )}

          {state.results &&
            (state.results.length ? (
              <ul className="mt-4 flex flex-col gap-1.5">
                {state.results.map((p) => {
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
                          {p.reason && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{p.reason}</p>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink-muted)]">No matches.</p>
            ))}
        </>
      ) : (
        keyword
      )}
    </div>
  );
}
