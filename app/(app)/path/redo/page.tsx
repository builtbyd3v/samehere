import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RediagnoseForm from "@/components/path/RediagnoseForm";

export default async function PathRedoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("id")
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

  return (
    <main className="page-enter mx-auto max-w-lg px-5 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        Path
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
        Something changed
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
        Re-run your path from your latest intake and applications. Optional: name what is stuck
        now.
      </p>

      <div className="mt-8">
        <RediagnoseForm showBlocker />
      </div>

      <p className="mt-6 text-sm text-[var(--ink-muted)]">
        <Link href="/home" className="underline hover:text-[var(--ink)]">
          Back to home
        </Link>
      </p>
    </main>
  );
}
