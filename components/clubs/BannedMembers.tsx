"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import AvatarImage from "@/components/ui/AvatarImage";
import { unbanMember } from "@/app/(app)/community/clubs/actions";

type BannedProfile = { username: string; display_name: string | null; avatar_url: string | null } | null;

type BanRow = { user_id: string; created_at: string; user: BannedProfile };

// Owner/officer-only "banned" list. club_bans' SELECT policy is gated to
// owner/officer (see clubs v3 moderation migration), so this renders empty
// for anyone else -- no canManage prop needed, RLS does the filtering.
export default function BannedMembers({ clubId }: { clubId: string }) {
  const [supabase] = useState(createClient);
  const [bans, setBans] = useState<BanRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("club_bans")
      .select("user_id, created_at, user:profiles!club_bans_user_id_fkey(username, display_name, avatar_url)")
      .eq("club_id", clubId)
      .then(({ data }) => {
        if (!cancelled) setBans((data ?? []) as unknown as BanRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, clubId]);

  function unban(userId: string) {
    startTransition(async () => {
      const res = await unbanMember(clubId, userId);
      if (!res.error) setBans((b) => b?.filter((r) => r.user_id !== userId) ?? b);
    });
  }

  if (!bans || bans.length === 0) return null;

  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Banned</h2>
      <div className="flex flex-col gap-2">
        {bans.map((b) => {
          const name = b.user?.display_name ?? b.user?.username ?? "Unknown";
          return (
            <div
              key={b.user_id}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3"
            >
              {b.user?.avatar_url ? (
                <AvatarImage
                  src={b.user.avatar_url}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 text-sm">
                {b.user ? (
                  <Link href={`/profile/${b.user.username}`} className="font-medium hover:underline">
                    {name}
                  </Link>
                ) : (
                  <span className="font-medium">{name}</span>
                )}
                {b.user && <span className="ml-1.5 text-[var(--ink-muted)]">@{b.user.username}</span>}
              </div>
              <button
                type="button"
                onClick={() => unban(b.user_id)}
                disabled={pending}
                className="shrink-0 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--featured-surface)] active:scale-[0.98] active:opacity-80 disabled:opacity-50"
              >
                Unban
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
