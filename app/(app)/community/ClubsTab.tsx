import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import CreateClubModal from "@/app/(app)/community/clubs/CreateClubModal";
import type { Database } from "@/types/database.types";

type ClubRow = Database["public"]["Tables"]["clubs"]["Row"];
type MemberClubRow = { club_id: string; clubs: ClubRow | null };

function ClubRowItem({ club, count }: { club: ClubRow; count: number }) {
  return (
    <Link
      href={`/community/clubs/${club.slug}`}
      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3 transition hover:bg-[var(--featured-surface)]"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]">
        {club.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5">
          <span className="truncate font-medium text-[var(--ink)]">{club.name}</span>
          <span className="shrink-0 text-xs text-[var(--ink-muted)]">
            {count} {count === 1 ? "member" : "members"}
          </span>
        </div>
        <p className="truncate text-xs text-[var(--ink-muted)]">{club.purpose}</p>
      </div>
    </Link>
  );
}

// Clubs tab: viewer's accepted clubs + a discover list of clubs not yet joined.
// Member counts come from a single grouped query over the clubs actually shown
// on this page (bounded — viewer's memberships + a 20-row discover list), not
// one count query per row.
export default async function ClubsTab() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already gates this route

  const { data: memberRows } = await supabase
    .from("club_members")
    .select("club_id, clubs(*)")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .order("joined_at", { ascending: false })
    .returns<MemberClubRow[]>();

  const yourClubs = (memberRows ?? [])
    .map((r) => r.clubs)
    .filter((c): c is ClubRow => c !== null);
  const yourClubIds = yourClubs.map((c) => c.id);

  let discoverQuery = supabase
    .from("clubs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (yourClubIds.length > 0) {
    discoverQuery = discoverQuery.not("id", "in", `(${yourClubIds.join(",")})`);
  }
  const { data: discoverData } = await discoverQuery.returns<ClubRow[]>();
  const discoverClubs = discoverData ?? [];

  const allIds = [...yourClubIds, ...discoverClubs.map((c) => c.id)];
  const counts = new Map<string, number>();
  if (allIds.length > 0) {
    const { data: countRows } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("status", "accepted")
      .in("club_id", allIds);
    for (const row of countRows ?? []) {
      counts.set(row.club_id, (counts.get(row.club_id) ?? 0) + 1);
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-6">
      {yourClubs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">Your clubs</h2>
          <div className="flex flex-col gap-2">
            {yourClubs.map((club) => (
              <ClubRowItem key={club.id} club={club} count={counts.get(club.id) ?? 0} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Discover</h2>
          <CreateClubModal />
        </div>
        {discoverClubs.length === 0 ? (
          <EmptyState title="No clubs yet" description="Be the first to start one." />
        ) : (
          <div className="flex flex-col gap-2">
            {discoverClubs.map((club) => (
              <ClubRowItem key={club.id} club={club} count={counts.get(club.id) ?? 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
