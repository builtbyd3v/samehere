import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnerProject } from "@/lib/portfolio/owner";
import UnavailableNotice from "@/components/portfolio/UnavailableNotice";
import ProjectEditor from "@/components/portfolio/ProjectEditor";
import AnalysisEvidenceSeam from "@/components/portfolio/analysis/AnalysisEvidenceSeam";
import { evidenceViewFromAnalysis } from "@/lib/portfolio/analysis-ui";
import { OWNER_ANALYSIS_SELECT, mapAnalysisRow } from "@/lib/repository-analysis/status";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (!profile?.username) redirect("/login");

  const project = await getOwnerProject(supabase, user.id, id);
  if (!project.ok) {
    if (project.unavailable) {
      return (
        <main className="mx-auto max-w-xl px-5 py-10">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Edit project</h1>
          <UnavailableNotice />
        </main>
      );
    }
    if (project.status === 404) notFound();
    return (
      <main className="mx-auto max-w-xl px-5 py-10">
        <p role="alert">{project.error}</p>
      </main>
    );
  }
  let beforeForm = null;
  if (project.data.source_analysis_id) {
    const { data, error } = await supabase
      .from("repository_analyses")
      .select(OWNER_ANALYSIS_SELECT)
      .eq("id", project.data.source_analysis_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (data && !error) {
      beforeForm = <AnalysisEvidenceSeam view={evidenceViewFromAnalysis(mapAnalysisRow(data))} />;
    }
  }
  return <ProjectEditor project={project.data} username={profile.username} beforeForm={beforeForm} />;
}
