import { Suspense } from "react";
import { getViewer, getViewerProfile } from "@/lib/viewer";
import PathAppNav from "@/components/layout/PathAppNav";
import TabTitleNotifier from "@/components/layout/TabTitleNotifier";
import { getUnreadCounts } from "@/lib/unread";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import PostHogUserIdentification from "@/components/providers/PostHogUserIdentification";
import SuspendedBanner from "@/components/layout/SuspendedBanner";
import { isPro } from "@/lib/pro";
import { loadViewerPathPlanUi } from "@/lib/path/load-plan";

async function TabTitleUnread({ userId }: { userId: string }) {
  const { dm, notif } = await getUnreadCounts();
  return <TabTitleNotifier initialTotal={dm + notif} userId={userId} />;
}

async function PathNavUnread(props: {
  username: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  isAdmin: boolean;
  navEmphasis?: string[];
}) {
  const { dm } = await getUnreadCounts();
  return <PathAppNav {...props} dmUnread={dm} />;
}

// Primer-style app chrome: fixed top path nav (no left rail), full-width content.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getViewer();
  const profile = await getViewerProfile();

  const [{ data: isAdmin }, { data: isSuspended }, planUi] = user
    ? await Promise.all([
        supabase.rpc("current_is_admin"),
        supabase.rpc("current_is_suspended"),
        loadViewerPathPlanUi(supabase, user.id),
      ])
    : [{ data: false }, { data: false }, null];

  const navProps = {
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isPro: profile ? isPro(profile) : false,
    isAdmin: isAdmin ?? false,
    navEmphasis: planUi?.nav_emphasis,
  };

  return (
    <ThemeProvider>
      <div className="landing-xai path-app">
        {user && (
          <PostHogUserIdentification
            distinctId={user.id}
            email={user.email ?? null}
            username={profile?.username ?? null}
          />
        )}
        <Suspense fallback={<PathAppNav {...navProps} />}>
          <PathNavUnread {...navProps} />
        </Suspense>
        {isSuspended && <SuspendedBanner />}
        {user && (
          <Suspense fallback={null}>
            <TabTitleUnread userId={user.id} />
          </Suspense>
        )}
        <div className="path-app-main mx-auto w-full max-w-[1120px] px-4 pb-16 pt-[4.5rem] sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
}
