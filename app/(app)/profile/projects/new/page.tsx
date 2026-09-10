import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectEditor from "@/components/portfolio/ProjectEditor";
import { AnalysisWorkbench } from "@/components/portfolio/analysis";
import { parseAnalysisQuery } from "@/lib/portfolio/analysis-ui";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string; github_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (!profile?.username) redirect("/login");
  const query = await searchParams;
  return (
    <ProjectEditor
      project={null}
      username={profile.username}
      beforeForm={
        <AnalysisWorkbench
          initialAnalysisId={parseAnalysisQuery(query.analysis)}
          githubError={typeof query.github_error === "string" ? query.github_error : null}
        />
      }
    />
  );
}
