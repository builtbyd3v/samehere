import { redirect } from "next/navigation";
import PathHome from "@/components/path/PathHome";
import {
  loadApplicationStages,
  loadOpportunities,
} from "@/lib/path/load-opportunities";
import { loadHomePathContext } from "@/lib/path/load-home-data";
import { loadViewerPathPlanUi } from "@/lib/path/load-plan";
import { getViewer } from "@/lib/viewer";

export default async function HomePage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  const planFromDb = await loadViewerPathPlanUi(supabase, user.id);
  if (!planFromDb) redirect("/onboarding");

  const [listings, applicationStages, context] = await Promise.all([
    loadOpportunities(supabase, user.id),
    loadApplicationStages(supabase, user.id),
    loadHomePathContext(supabase, user.id),
  ]);

  return (
    <PathHome
      plan={planFromDb}
      listings={listings.length ? listings : undefined}
      applicationStages={applicationStages ?? undefined}
      context={context}
    />
  );
}
