"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import UserBadges from "./UserBadges";
import AvatarImage from "@/components/ui/AvatarImage";

export type FollowRequest = {
  follower_id: string;
  requester: { username: string; display_name: string | null; avatar_url: string | null; is_pro: boolean; is_founder: boolean; is_campus_founder: boolean } | null;
};

export default function FollowRequests({ requests }: { requests: FollowRequest[] }) {
  const [supabase] = useState(createClient);
  const [list, setList] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);

  // accept_follow / reject_follow are definer functions — only the target
  // (auth.uid() = following_id) can act on a pending request.
  async function act(followerId: string, accept: boolean) {
    setBusy(followerId);
    const { error } = await supabase.rpc(accept ? "accept_follow" : "reject_follow", { p_follower: followerId });
    setBusy(null);
    if (!error) setList((l) => l.filter((r) => r.follower_id !== followerId));
  }

  if (list.length === 0) return null;

  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Follow requests</h2>
      <div className="flex flex-col gap-2">
        {list.map((r) => {
          const name = r.requester?.display_name ?? r.requester?.username ?? "Unknown";
          return (
            <div
              key={r.follower_id}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
            >
              {r.requester?.avatar_url ? (
                <AvatarImage
                  src={r.requester.avatar_url}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-x-1.5">
                  {r.requester ? (
                    <Link href={`/profile/${r.requester.username}`} className="font-medium hover:underline">{name}</Link>
                  ) : (
                    <span className="font-medium">{name}</span>
                  )}
                  {r.requester && <UserBadges isPro={r.requester.is_pro} isFounder={r.requester.is_founder} isCampusFounder={r.requester.is_campus_founder} />}
                  {r.requester && <span className="text-[var(--ink-muted)]">@{r.requester.username}</span>}
                </div>
              </div>
              <button type="button" onClick={() => act(r.follower_id, true)} disabled={busy === r.follower_id}
                className="btn-inset shrink-0 rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:scale-[0.98] active:opacity-80 disabled:opacity-50 disabled:active:scale-100">
                {busy === r.follower_id ? "…" : "Accept"}
              </button>
              <button type="button" onClick={() => act(r.follower_id, false)} disabled={busy === r.follower_id}
                className="shrink-0 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--featured-surface)] active:scale-[0.98] active:opacity-80 disabled:opacity-50 disabled:active:scale-100">
                Reject
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
