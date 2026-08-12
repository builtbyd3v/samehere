import { redirect } from "next/navigation";
import PathHome from "@/components/path/PathHome";
import {
  loadApplicationStages,
  loadOpportunities,
} from "@/lib/path/load-opportunities";
import { loadHomePathContext } from "@/lib/path/load-home-data";
import { loadViewerPathPlanUi } from "@/lib/path/load-plan";
import { isPro } from "@/lib/pro";
import { getViewer, getViewerProfile } from "@/lib/viewer";

export default async function HomePage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  const planFromDb = await loadViewerPathPlanUi(supabase, user.id);
  if (!planFromDb) redirect("/onboarding");

  const [listings, applicationStages] = await Promise.all([
    loadOpportunities(supabase, user.id),
    loadApplicationStages(supabase, user.id),
  ]);

  // Pass opportunity company slug/org into home context so helpers can fall
  // back when intake target_companies are missing (see lib/path/home-helpers.ts).
  const context = await loadHomePathContext(supabase, user.id, {
    companies: listings.map((row) => ({
      org: row.org,
      company_slug: row.company_slug,
    })),
  });

  const profile = await getViewerProfile();
  const showProUpsell = profile ? !isPro(profile) : false;

  return (
    <PathHome
      plan={planFromDb}
      listings={listings.length ? listings : undefined}
      applicationStages={applicationStages ?? undefined}
      context={context}
      showProUpsell={showProUpsell}
    />
  );
}
