import { redirect } from "next/navigation";
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

      <section className="card overflow-hidden">
        <NotificationList items={(items ?? []) as NotificationRow[]} />
      </section>
    </main>
  );
}
