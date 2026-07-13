import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NotificationList from "@/components/notifications/NotificationList";
import NotificationsMarkRead from "@/components/notifications/NotificationsMarkRead";
import type { NotificationRow } from "@/lib/notifications";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items, error } = await supabase.rpc("list_notifications", { p_limit: 50 });
  if (error) {
    console.error("list_notifications failed:", error.message);
  }

  return (
    <main className="page-enter mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <NotificationsMarkRead />
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Notifications</h1>

      {error ? (
        <div className="card px-6 py-14 text-center">
          <p className="text-sm font-medium text-[var(--ink)]">Couldn&apos;t load notifications</p>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">Something went wrong on our end.</p>
          <Link href="/notifications" className="btn-ghost mt-5 inline-flex">
            Try again
          </Link>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <NotificationList items={(items ?? []) as NotificationRow[]} />
        </section>
      )}
    </main>
  );
}
