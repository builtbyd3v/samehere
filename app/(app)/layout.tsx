import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import LeftNav from "@/components/layout/LeftNav";
import LeftNavUnread from "@/components/layout/LeftNavUnread";
import MobileNav from "@/components/layout/MobileNav";
import MobileNavUnread from "@/components/layout/MobileNavUnread";
import TabTitleNotifier from "@/components/layout/TabTitleNotifier";
import { getUnreadCounts } from "@/lib/unread";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import PostHogUserIdentification from "@/components/providers/PostHogUserIdentification";
import { isPro } from "@/lib/pro";

// Combined DM + notification unread badge for the browser tab title. Shares the
// request-cached getUnreadCounts() with the nav badge wrappers, so the whole
// shell makes one pair of unread RPCs, not one pair per consumer. Its own
// Suspense boundary (decoration, must never block the shell on a slow count).
async function TabTitleUnread() {
  const { dm, notif } = await getUnreadCounts();
  return <TabTitleNotifier initialTotal={dm + notif} />;
}

// Wraps every authed page with the app shell: top bar, a persistent left nav
// (desktop) / bottom bar (mobile), and the centered content area. The proxy
// already gates these routes; this just needs the username for the profile link.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("username, avatar_url, is_pro, pro_until").eq("id", user.id).single()
    : { data: null };

  // is_admin is a privileged column (revoked from the authenticated role); read
  // it through the own-status definer instead, same as app/(app)/admin/page.tsx.
  const { data: isAdmin } = user ? await supabase.rpc("current_is_admin") : { data: false };

  const navbarProps = {
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isPro: profile ? isPro(profile) : false,
    isAdmin: isAdmin ?? false,
  };

  return (
    <ThemeProvider>
      {user && (
        <PostHogUserIdentification
          distinctId={user.id}
          email={user.email ?? null}
          username={profile?.username ?? null}
        />
      )}
      <Navbar {...navbarProps} />
      {user && (
        <Suspense fallback={null}>
          <TabTitleUnread />
        </Suspense>
      )}
      <div className="mx-auto flex w-full max-w-[1320px] justify-center gap-7 px-4 pb-20 sm:px-6 lg:pb-0">
        <aside className="hidden w-60 shrink-0 pt-6 lg:block lg:pt-8">
          <div className="sticky top-[72px]">
            {/* Nav badges are decoration — stream them so a slow unread RPC never
                blocks the nav from rendering. Fallback is the nav with no badges. */}
            <Suspense fallback={<LeftNav username={navbarProps.username} isPro={navbarProps.isPro} />}>
              <LeftNavUnread username={navbarProps.username} isPro={navbarProps.isPro} />
            </Suspense>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
        <div className="shell-rspacer hidden shrink-0 lg:block lg:w-60" aria-hidden />
      </div>
      <Suspense fallback={<MobileNav username={navbarProps.username} />}>
        <MobileNavUnread username={navbarProps.username} />
      </Suspense>
    </ThemeProvider>
  );
}
