import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AppPage,
  AppPageHeader,
  AppPanel,
} from "@/components/app/AppPrimitives";
import PrivacyForm from "@/components/settings/PrivacyForm";
import OpenToHelpForm from "@/components/settings/OpenToHelpForm";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import UsernameForm from "@/components/settings/UsernameForm";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import AvatarBase from "@/components/ui/Avatar";
import StudentVerification from "@/components/settings/StudentVerification";
import RediagnoseForm from "@/components/path/RediagnoseForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { unblockUser } from "./actions";

type BlockedRow = {
  blocked_id: string;
  blocked: { username: string; display_name: string | null; avatar_url: string | null; is_pro: boolean } | null;
};

function BlockedUsersFallback() {
  return (
    <ul className="space-y-2">
      {[0, 1].map((i) => (
        <li key={i} className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function BlockedUsers({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(username, display_name, avatar_url, is_pro)")
    .eq("blocker_id", userId)
    .returns<BlockedRow[]>();

  if (!blocks?.length) {
    return <p className="text-sm text-[var(--ink-muted)]">No blocked users.</p>;
  }

  return (
    <ul>
      {blocks.map((b) => {
        const name = b.blocked?.display_name ?? b.blocked?.username ?? "Unknown";
        return (
          <li
            key={b.blocked_id}
            className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0"
          >
            <AvatarBase
              src={b.blocked?.avatar_url ?? null}
              seed={b.blocked?.username ?? name}
              name={name}
              className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] text-sm"
              pro={b.blocked?.is_pro ?? false}
            />
            <div className="min-w-0 flex-1 text-sm text-[var(--ink)]">
              {b.blocked ? (
                <Link href={`/profile/${b.blocked.username}`} className="font-medium hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="font-medium">{name}</span>
              )}
              {b.blocked && <span className="ml-1.5 text-[var(--ink-muted)]">@{b.blocked.username}</span>}
            </div>
            <form action={unblockUser.bind(null, b.blocked_id)}>
              <button
                type="submit"
                className="cursor-pointer text-sm text-[var(--ink-muted)] underline transition hover:text-[var(--ink)]"
              >
                Unblock
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AppPanel className="p-5 sm:p-6">
      <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--ink)]">{title}</h2>
      {description ? <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </AppPanel>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // open_to_help may be absent until WS1; default false if the select omits it
  // or the row shape is partial during rollout.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_private, hide_school, heatmap_visibility, leaderboard_opt_out, email_digest_opt_out, verified_student, open_to_help")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const openToHelp = "open_to_help" in profile ? !!profile.open_to_help : false;

  return (
    <AppPage width="narrow">
      <AppPageHeader
        kicker="Account"
        title="Settings"
        description={
          <>
            Manage login, privacy, and path controls. Profile details live in{" "}
            <Link href="/profile/edit" className="underline hover:text-[var(--ink)]">
              Edit profile
            </Link>
            .
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <SettingsSection title="Account">
          <UsernameForm username={profile.username} />
          <div className="my-6 border-t border-[var(--border)]" />
          <ChangePasswordForm />
        </SettingsSection>

        <SettingsSection title="Student verification">
          <StudentVerification verified={profile.verified_student} />
        </SettingsSection>

        <SettingsSection
          title="Company helpers"
          description="Appear on listings for orgs you've interned or worked at, so seekers can DM you."
        >
          <OpenToHelpForm initial={openToHelp} />
        </SettingsSection>

        <SettingsSection title="Privacy">
          <PrivacyForm initial={profile} />
          <h3 className="mb-3 mt-6 text-sm font-medium text-[var(--ink)]">Blocked users</h3>
          <Suspense fallback={<BlockedUsersFallback />}>
            <BlockedUsers userId={user.id} />
          </Suspense>
        </SettingsSection>

        <SettingsSection
          title="Path"
          description="Stuck or something changed? Refresh your plan from intake and applications."
        >
          <RediagnoseForm />
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            Or{" "}
            <Link href="/path/redo" className="underline hover:text-[var(--ink)]">
              add a blocker note
            </Link>
            .
          </p>
        </SettingsSection>

        <DeleteAccountSection username={profile.username} />
      </div>
    </AppPage>
  );
}
