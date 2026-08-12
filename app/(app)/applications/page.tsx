import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import ApplicationBoard from "@/components/applications/ApplicationBoard";
import {
  APPLICATION_STATUSES,
  type ApplicationRow,
  type ApplicationStatus,
} from "./actions";

function asStatus(value: string): ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value)
    ? (value as ApplicationStatus)
    : "wishlist";
}

export const metadata = { title: "Applications · samehere" };

export default async function ApplicationsPage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("applications")
    .select("id, user_id, listing_id, org, role, status, notes, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // WS1 may still be landing — render an empty board with a soft notice rather
  // than exploding the page when the table isn't queryable yet.
  const unavailable = !!error;
  const initial: ApplicationRow[] = (data ?? []).map((row) => ({
    ...row,
    status: asStatus(row.status),
  }));

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="mb-2 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
        Applications
      </h1>
      <p className="mb-6 text-sm text-[var(--ink-muted)]">
        Wishlist → applied → OA → interview → offer. Move rows as you go.
      </p>

      {unavailable && (
        <p className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--featured-surface)] px-3 py-2 text-sm text-[var(--ink-muted)]">
          Tracker is warming up — you can still browse opportunities meanwhile.
        </p>
      )}

      <ApplicationBoard initial={initial} />
    </main>
  );
}
