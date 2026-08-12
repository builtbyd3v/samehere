import { redirect } from "next/navigation";
import PathHome from "@/components/path/PathHome";
import { pathPlanOrFixture, loadViewerPathPlanUi } from "@/lib/path/load-plan";
import { getViewer } from "@/lib/viewer";

// Recipe path home (WS3). Reads path_plans.ui when present; falls back to a
// studio fixture while WS1+WS2 schema/intake are not merged yet.
export default async function HomePage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  // WS1+WS2 will wire real path_plans rows. Until then, missing table / RLS /
  // types must not break the route — catch via loadViewerPathPlanUi → null.
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

  const plan = pathPlanOrFixture(planFromDb);
  return <PathHome plan={plan} />;
}
