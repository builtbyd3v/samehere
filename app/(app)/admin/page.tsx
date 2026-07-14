import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LocalTime from "@/components/ui/LocalTime";
import ReportActions from "./ReportActions";
import FeedbackActions from "./FeedbackActions";

export const metadata: Metadata = { title: "Admin" };

const clip = (s: string | null) => ((s ?? "").length > 280 ? `${(s ?? "").slice(0, 280)}…` : (s ?? ""));

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("current_is_admin");
  if (!isAdmin) redirect("/feed");

  const [{ data: reports }, { data: feedback }] = await Promise.all([
    supabase.rpc("admin_list_reports"),
    supabase.rpc("admin_list_feedback"),
  ]);
  const rows = reports ?? [];
  const feedbackRows = feedback ?? [];

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Moderation</h1>
      <p className="mb-5 text-sm text-[var(--ink-muted)]">{rows.length} open report{rows.length === 1 ? "" : "s"}</p>

      {rows.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-[var(--ink-muted)]">
          Nothing to review.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.report_id}
              className="card p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-muted)]">
                <span className="rounded-full bg-[var(--featured-surface)] px-2 py-0.5 font-medium text-[var(--ink)]">
                  {r.reason ?? "report"}
                </span>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5">{r.target_type}</span>
                <span>
                  by @{r.reporter_username ?? "deleted"} · <LocalTime iso={r.created_at} />
                </span>
                {r.post_hidden && <span className="text-[var(--blue)]">post hidden</span>}
                {r.author_suspended && <span className="text-[var(--danger)]">author suspended</span>}
              </div>

              {r.detail && <p className="mb-2 text-sm text-[var(--ink-muted)]">&ldquo;{r.detail}&rdquo;</p>}

              {r.target_type === "post" &&
                (r.post_id ? (
                  <Link
                    href={`/post/${r.post_id}`}
                    className="mb-3 block whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3 text-sm text-[var(--ink)] transition hover:border-[var(--border-strong)]"
                  >
                    {clip(r.post_content)}
                  </Link>
                ) : (
                  <p className="mb-3 whitespace-pre-wrap rounded-lg border border-[var(--border)] border-dashed bg-[var(--canvas)] p-3 text-sm text-[var(--ink-muted)]">
                    {r.snapshot ? clip(r.snapshot) : "(post deleted)"}
                    <span className="mt-1 block text-xs text-[var(--ink-faint)]">post deleted, snapshot at report time</span>
                  </p>
                ))}

              {r.target_type === "message" && (
                <p className="mb-3 whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3 text-sm text-[var(--ink)]">
                  {r.message_content
                    ? clip(r.message_content)
                    : r.snapshot
                      ? clip(r.snapshot)
                      : "(message deleted)"}
                  {!r.message_content && (
                    <span className="mt-1 block text-xs text-[var(--ink-faint)]">message deleted, snapshot at report time</span>
                  )}
                </p>
              )}

              <div className="mb-3 text-xs text-[var(--ink-muted)]">
                {r.target_type === "post" ? "author" : "user"}{" "}
                {r.author_username ? (
                  <Link href={`/profile/${r.author_username}`} className="text-[var(--ink)] hover:underline">
                    @{r.author_username}
                  </Link>
                ) : (
                  <span>deleted</span>
                )}
              </div>

              <ReportActions
                reportId={r.report_id}
                postId={r.target_type === "post" ? r.post_id : null}
                authorId={r.author_id}
                postHidden={r.post_hidden}
                authorSuspended={r.author_suspended}
              />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 mb-1 text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Feedback</h2>
      <p className="mb-4 text-sm text-[var(--ink-muted)]">
        {feedbackRows.length} unresolved item{feedbackRows.length === 1 ? "" : "s"}
      </p>

      {feedbackRows.length === 0 ? (
        <div className="card px-4 py-8 text-center text-sm text-[var(--ink-muted)]">Inbox zero.</div>
      ) : (
        <ul className="space-y-3">
          {feedbackRows.map((f) => (
            <li key={f.feedback_id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-muted)]">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    f.category === "bug"
                      ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                      : "bg-[var(--featured-surface)] text-[var(--ink)]"
                  }`}
                >
                  {f.category}
                </span>
                <span>
                  {f.author_username ? (
                    <Link href={`/profile/${f.author_username}`} className="text-[var(--ink)] hover:underline">
                      @{f.author_username}
                    </Link>
                  ) : (
                    "deleted account"
                  )}{" "}
                  · <LocalTime iso={f.created_at} />
                </span>
              </div>
              <p className="mb-3 whitespace-pre-wrap text-sm text-[var(--ink)]">{f.message}</p>
              <FeedbackActions feedbackId={f.feedback_id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
