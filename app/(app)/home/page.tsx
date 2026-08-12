import { redirect } from "next/navigation";
import PathHome from "@/components/path/PathHome";
import {
  loadApplicationStages,
  loadOpportunities,
} from "@/lib/path/load-opportunities";
import { pathPlanOrFixture, loadViewerPathPlanUi } from "@/lib/path/load-plan";
import { getViewer } from "@/lib/viewer";

// Recipe path home (WS3). Reads path_plans.ui from WS2 intake when present;
// falls back to a studio fixture for skip-onboarding / missing rows.
// WS6: opportunities shortlist + application stage counts when queryable.
export default async function HomePage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  // Missing plan → send unfinished users to intake; onboarded skippers get fixture.
  const planFromDb = await loadViewerPathPlanUi(supabase, user.id);

  if (!planFromDb) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.onboarded_at) {
      redirect("/onboarding");
    }
  }

  const [listings, applicationStages] = await Promise.all([
    loadOpportunities(supabase, user.id),
    loadApplicationStages(supabase, user.id),
  ]);

  const plan = pathPlanOrFixture(planFromDb);
  return (
    <PathHome
      plan={plan}
      listings={listings.length ? listings : undefined}
      applicationStages={applicationStages ?? undefined}
    />
  );
}
