"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { peopleSearch } from "@/app/(app)/feed/actions";
import type { PeopleSearchState } from "@/lib/people-search";
import FollowButton from "@/components/profile/FollowButton";
import UserBadges from "@/components/profile/UserBadges";
import AvatarBase from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { TEXT_LIMITS } from "@/lib/utils/validation";

// Persistent feed search with two modes: keyword (server-rendered, free,
// unlimited — passed in as `keyword`) and smart natural-language AI search
// (metered: 5/day free, Pro 150/day). Smart results render client-side.
const inputCls =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

function tab(active: boolean): string {
  return `rounded-full px-2.5 py-1 font-medium transition ${
    active
      ? "bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--blue)]"
      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
  }`;
}

export default function PeopleSearch({
  keyword,
  isPro = false,
  initialQuery = "",
  initialSmart = false,
}: {
  keyword: ReactNode;
  isPro?: boolean;
  initialQuery?: string;
  initialSmart?: boolean;
}) {
  const [smart, setSmart] = useState(initialSmart);
  const [q, setQ] = useState(initialQuery);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [state, setState] = useState<PeopleSearchState>({});
  const [pending, startTransition] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    startTransition(async () => {
      const result = await peopleSearch(query, verifiedOnly);
      setState(result);
      posthog.capture("people_search_run", {
        outcome: result.overCap ? "over_cap" : result.error ? "error" : result.results?.length ? "results" : "empty",
        result_count: result.results?.length ?? 0,
        verified_only: verifiedOnly,
      });
    });
  }

  // Arrived already in Smart mode with a query (nav/page search picked "✦ Smart")
  // → run the AI search once on mount so the user doesn't have to search again.
  // Verified-only always starts off, so this passes the initial (false) state.
  useEffect(() => {
    if (initialSmart && initialQuery.trim()) {
      startTransition(async () => {
        const result = await peopleSearch(initialQuery.trim(), verifiedOnly);
        setState(result);
        posthog.capture("people_search_run", {
          outcome: result.overCap ? "over_cap" : result.error ? "error" : result.results?.length ? "results" : "empty",
          result_count: result.results?.length ?? 0,
          verified_only: verifiedOnly,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {pending ? "Searching…" : "Search"}
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--ink-faint)]">
              AI finds students that fit your description.{isPro ? " 150 a day on Pro." : " Free searches: 5 a day."}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={verifiedOnly}
              onClick={() => setVerifiedOnly((v) => !v)}
              title="Only show school-confirmed students"
              className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition"
              style={
                verifiedOnly
                  ? { backgroundColor: "var(--blue)", color: "#fff", borderColor: "transparent" }
                  : { backgroundColor: "transparent", color: "var(--ink-muted)", borderColor: "var(--border)" }
              }
            >
              Verified only{verifiedOnly ? " · on" : ""}
            </button>
          </div>

          {pending && (
            <ul className="mt-4 flex flex-col gap-1.5">
              {[0, 1, 2].map((i) => (
                <li key={i} className="card flex items-center gap-2.5 px-3 py-2.5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!pending && state.error && <p className="mt-2 text-sm text-[var(--danger)]">{state.error}</p>}

          {!pending && state.overCap && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm">
              <p className="text-[var(--ink)]">You&apos;ve used today&apos;s free smart searches.</p>
              <Link href="/pro" className="mt-1 inline-block text-[var(--ink-muted)] underline">
                Go Pro for 150 a day
              </Link>
            </div>
          )}

          {!pending && state.empty && (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              No students matched. Try describing it a different way.
            </p>
          )}

          {!pending && state.results &&
            (state.results.length ? (
              <ul className="mt-4 flex flex-col gap-1.5">
                {state.results.map((p) => {
                  const name = p.display_name ?? p.username;
                  return (
                    <li key={p.id} className="card card-hover flex items-center gap-2.5 px-3 py-2.5">
                      <Link
                        href={`/profile/${p.username}`}
                        className="flex min-w-0 flex-1 items-center gap-2.5 active:scale-[0.99]"
                      >
                        <AvatarBase
                          src={p.avatar_url}
                          seed={p.username}
                          name={name}
                          className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
                          pro={p.is_pro}
                        />
                        <div className="min-w-0 text-sm">
                          <p className="flex flex-wrap items-center gap-x-1.5 font-medium">
                            {name}
                            <UserBadges isPro={p.is_pro} isFounder={p.is_founder} isCampusFounder={p.is_campus_founder} isVerifiedStudent={p.verified_student} />
                          </p>
                          <p className="text-[var(--ink-muted)]">@{p.username}</p>
                          {p.reason && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{p.reason}</p>}
                        </div>
                      </Link>
                      <FollowButton targetId={p.id} initial="none" />
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
