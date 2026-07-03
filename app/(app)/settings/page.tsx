import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrivacyForm from "@/components/settings/PrivacyForm";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import { unblockUser } from "./actions";

type BlockedRow = {
  blocked_id: string;
  blocked: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: blocks }] = await Promise.all([
    supabase.from("profiles").select("is_private, hide_school, heatmap_visibility").eq("id", user.id).single(),
    supabase
      .from("blocks")
      .select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(username, display_name, avatar_url)")
      .eq("blocker_id", user.id)
      .returns<BlockedRow[]>(),
  ]);
  if (!profile) redirect("/login");

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-[-0.02em]">Settings</h1>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Privacy</h2>
        <PrivacyForm initial={profile} />
      </section>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
        <ChangePasswordForm />
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Blocked users</h2>
        {!blocks?.length ? (
          <p className="text-sm text-[var(--ink-muted)]">No blocked users.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((b) => {
              const name = b.blocked?.display_name ?? b.blocked?.username ?? "Unknown";
              return (
                <li key={b.blocked_id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                  {b.blocked?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.blocked.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover" />
                  ) : (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-sm font-semibold text-[var(--ink-muted)]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    {b.blocked ? (
                      <Link href={`/profile/${b.blocked.username}`} className="font-medium hover:underline">{name}</Link>
                    ) : (
                      <span className="font-medium">{name}</span>
                    )}
                    {b.blocked && <span className="ml-1.5 text-[var(--ink-muted)]">@{b.blocked.username}</span>}
                  </div>
                  <form action={unblockUser.bind(null, b.blocked_id)}>
                    <button type="submit" className="text-sm text-[var(--ink-muted)] underline">Unblock</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
