import { Suspense } from "react";
import AppBrand from "@/components/brand/AppBrand";
import { getViewer, getViewerProfile } from "@/lib/viewer";
import Navbar from "@/components/layout/Navbar";
import LeftNav, { type ShellUser } from "@/components/layout/LeftNav";
import LeftNavUnread from "@/components/layout/LeftNavUnread";
import MobileNav from "@/components/layout/MobileNav";
import MobileNavUnread from "@/components/layout/MobileNavUnread";
import TabTitleNotifier from "@/components/layout/TabTitleNotifier";
import { getUnreadCounts } from "@/lib/unread";
import PostHogUserIdentification from "@/components/providers/PostHogUserIdentification";
import SuspendedBanner from "@/components/layout/SuspendedBanner";
import { isPro } from "@/lib/pro";

// Combined DM + notification unread badge for the browser tab title. Shares the
// request-cached getUnreadCounts() with the nav badge wrappers, so the whole
// shell makes one pair of unread RPCs, not one pair per consumer. Its own
// Suspense boundary (decoration, must never block the shell on a slow count).
async function TabTitleUnread({ userId }: { userId: string }) {
  const { dm, notif } = await getUnreadCounts();
  return <TabTitleNotifier initialTotal={dm + notif} userId={userId} />;
}

// Wraps every authed page with the app shell: top bar, a persistent left nav
// (desktop) / bottom bar (mobile), and the centered content area. The proxy
// already gates these routes; this just needs the username for the profile link.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getViewer();
  const profile = await getViewerProfile();

  // is_admin / is_suspended are privileged columns (revoked from the
  // authenticated role); read them through the own-status definer RPCs
  // instead, same as app/(app)/admin/page.tsx. Resolved concurrently since
  // neither depends on the other.
  const [{ data: isAdmin }, { data: isSuspended }] = user
    ? await Promise.all([supabase.rpc("current_is_admin"), supabase.rpc("current_is_suspended")])
    : [{ data: false }, { data: false }];

  const shellUser: ShellUser = {
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    stage: profile?.stage ?? null,
    isPro: profile ? isPro(profile) : false,
    isAdmin: isAdmin ?? false,
  };

  return (
    <>
      {user && (
        <PostHogUserIdentification
          distinctId={user.id}
          email={user.email ?? null}
          username={profile?.username ?? null}
        />
      )}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--ink)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-blue-strong)_45%,transparent)]"
      >
        Skip to content
      </a>
      <Navbar user={shellUser} />
      {isSuspended && <SuspendedBanner />}
      {user && (
        <Suspense fallback={null}>
          <TabTitleUnread userId={user.id} />
        </Suspense>
      )}
      <div className={`app-shell min-h-dvh ${user ? "lg:grid lg:grid-cols-[240px_minmax(0,1fr)]" : ""}`}>
        {user && (
          <aside className="hidden border-r border-[var(--hairline)] lg:block">
            <div className="sticky top-0 flex h-dvh flex-col px-3 py-5">
              <div className="px-2.5 pb-[22px] pt-1.5">
                <AppBrand href="/feed" />
              </div>
              {/* Nav badges are decoration: stream them so a slow unread RPC never
                  blocks the nav from rendering. Fallback is the nav with no badges. */}
              <Suspense fallback={<LeftNav user={shellUser} />}>
                <LeftNavUnread user={shellUser} />
              </Suspense>
            </div>
          </aside>
        )}
        {/* 848px = the old 800px content column plus 24px padding each side, so
            non-feed pages keep their width. The feed opts out via has-[[data-feed-page]]. */}
        <div
          id="main"
          className="mx-auto w-full min-w-0 max-w-[848px] px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-0 lg:has-[[data-feed-page]]:max-w-none lg:has-[[data-feed-page]]:px-0"
        >
          {children}
        </div>
      </div>
      {user && (
        <Suspense fallback={<MobileNav username={shellUser.username} />}>
          <MobileNavUnread username={shellUser.username} />
        </Suspense>
      )}
    </>
  );
}
