import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrivacyForm from "@/components/settings/PrivacyForm";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import AvatarImage from "@/components/ui/AvatarImage";
import ThemeToggle from "@/components/ui/ThemeToggle";
import StudentVerification from "@/components/settings/StudentVerification";
import { unblockUser } from "./actions";

type BlockedRow = {
  blocked_id: string;
  blocked: { username: string; display_name: string | null; avatar_url: string | null; is_pro: boolean } | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: blocks }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, is_private, hide_school, heatmap_visibility, leaderboard_opt_out, verified_student")
      .eq("id", user.id)
      .single(),
    supabase
      .from("blocks")
      .select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(username, display_name, avatar_url, is_pro)")
      .eq("blocker_id", user.id)
      .returns<BlockedRow[]>(),
  ]);
  if (!profile) redirect("/login");

  return (
    <main className="page-enter mx-auto max-w-xl px-5 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Settings</h1>

      <div className="space-y-5">
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">Account</h2>
          <p className="mb-4 text-sm text-[var(--ink-muted)]">
            Username and profile details live in{" "}
            <Link href="/profile/edit" className="underline hover:text-[var(--ink)]">Edit profile</Link>.
          </p>
          <ChangePasswordForm />
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">Student verification</h2>
          <StudentVerification verified={profile.verified_student} />
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">Privacy</h2>
          <PrivacyForm initial={profile} />

          <h3 className="mb-4 mt-6 text-sm font-semibold text-[var(--ink)]">Blocked users</h3>
          {!blocks?.length ? (
            <p className="text-sm text-[var(--ink-muted)]">No blocked users.</p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b) => {
                const name = b.blocked?.display_name ?? b.blocked?.username ?? "Unknown";
                return (
                  <li key={b.blocked_id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 transition hover:border-[var(--border-strong)]">
                    {b.blocked?.avatar_url ? (
                      <AvatarImage src={b.blocked.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] object-cover" pro={b.blocked.is_pro ?? false} />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--canvas)] text-sm font-semibold text-[var(--ink-muted)]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-sm text-[var(--ink)]">
                      {b.blocked ? (
                        <Link href={`/profile/${b.blocked.username}`} className="font-medium hover:underline">{name}</Link>
                      ) : (
                        <span className="font-medium">{name}</span>
                      )}
                      {b.blocked && <span className="ml-1.5 text-[var(--ink-muted)]">@{b.blocked.username}</span>}
                    </div>
                    <form action={unblockUser.bind(null, b.blocked_id)}>
                      <button type="submit" className="cursor-pointer text-sm text-[var(--ink-muted)] underline transition hover:text-[var(--ink)]">Unblock</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold text-[var(--ink)]">Appearance</h2>
          <p className="mb-4 text-sm text-[var(--ink-muted)]">Choose light, dark, or match your system.</p>
          <ThemeToggle />
        </section>

        <DeleteAccountSection username={profile.username} />
      </div>
    </main>
  );
}
