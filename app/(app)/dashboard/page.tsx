import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Stub — the real dashboard (followed-user feed + suggested users) is Phase 9.
// Exists now so login's redirect target resolves instead of 404ing.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("username, display_name").eq("id", user.id).single()
    : { data: null };

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">
        Welcome back{profile ? `, ${profile.display_name ?? profile.username}` : ""}.
      </h1>
      <p className="mt-2 text-[15px] text-[var(--ink-muted)]">
        Your dashboard is coming together. {/* TODO(Phase 9): followed-user feed + suggested users */}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className="rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition active:opacity-80"
          >
            Your profile
          </Link>
        )}
        <Link
          href="/feed"
          className="btn-inset rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] transition active:opacity-80"
        >
          Go to feed
        </Link>
      </div>
    </main>
  );
}
