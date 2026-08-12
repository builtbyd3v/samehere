import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AppPage,
  AppPageHeader,
  AppPanel,
} from "@/components/app/AppPrimitives";
import PathIntakeForm from "@/components/path/PathIntakeForm";
import { intakeFromAnswersJson } from "@/lib/path/diagnose";
import { createClient } from "@/lib/supabase/server";

export default async function PathRedoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("id, answers")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("path_plans")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!intake && !plan) {
    redirect("/onboarding");
  }

  const defaults = intakeFromAnswersJson(intake?.answers);

  return (
    <AppPage width="narrow">
      <AppPageHeader
        kicker="Path"
        title="Something changed"
        description="Update where you are, then diagnose again. This writes a new intake version."
      />

      <AppPanel className="p-6">
        <PathIntakeForm
          defaults={defaults}
          heading="Where are you now?"
          description="Change stage, timeline, or the blocker. Your path home will match the new diagnosis."
          submitLabel="Diagnose my path again"
          pendingLabel="Diagnosing…"
        />
      </AppPanel>

      <p className="mt-6 text-sm text-[var(--ink-muted)]">
        <Link href="/home" className="underline hover:text-[var(--ink)]">
          Back to home
        </Link>
      </p>
    </AppPage>
  );
}
