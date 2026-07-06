import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LocalTime from "@/components/ui/LocalTime";
import ReportActions from "./ReportActions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("current_is_admin");
  if (!isAdmin) redirect("/feed");

  const { data: reports } = await supabase.rpc("admin_list_reports");
  const rows = reports ?? [];

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Moderation</h1>
      <p className="mb-5 text-sm text-[var(--ink-muted)]">{rows.length} open report{rows.length === 1 ? "" : "s"}</p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-4 py-10 text-center text-sm text-[var(--ink-muted)]">
          Nothing to review.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.report_id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-muted)]">
                <span className="rounded-full bg-[var(--featured-surface)] px-2 py-0.5 font-medium text-[var(--ink)]">
                  {r.reason ?? "report"}
                </span>
                <span>
                  by @{r.reporter_username ?? "deleted"} · <LocalTime iso={r.created_at} />
                </span>
                {r.post_hidden && <span className="text-[var(--blue)]">post hidden</span>}
                {r.author_suspended && <span className="text-red-500">author suspended</span>}
              </div>

              {r.detail && <p className="mb-2 text-sm text-[var(--ink-muted)]">&ldquo;{r.detail}&rdquo;</p>}

              <Link
                href={`/post/${r.post_id}`}
                className="mb-3 block whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3 text-sm text-[var(--ink)] transition hover:border-[var(--border-strong)]"
              >
                {r.post_content.length > 280 ? `${r.post_content.slice(0, 280)}…` : r.post_content}
              </Link>

              <div className="mb-3 text-xs text-[var(--ink-muted)]">
                author{" "}
                <Link href={`/profile/${r.author_username}`} className="text-[var(--ink)] hover:underline">
                  @{r.author_username}
                </Link>
              </div>

              <ReportActions
                reportId={r.report_id}
                postId={r.post_id}
                authorId={r.author_id}
                postHidden={r.post_hidden}
                authorSuspended={r.author_suspended}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
