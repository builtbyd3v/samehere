import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { AppNotice, AppPage, AppPageHeader } from "@/components/app/AppPrimitives";
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
    <AppPage width="medium">
      <AppPageHeader
        kicker="Pipeline"
        title="Applications"
        description="Track the roles that matter. When one moves to an assessment or interview, your path switches into prep."
      />

      {unavailable && (
        <div className="mb-4">
          <AppNotice>
          Tracker is warming up — you can still browse opportunities meanwhile.
          </AppNotice>
        </div>
      )}

      <ApplicationBoard initial={initial} />
    </AppPage>
  );
}
