import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import NavbarUnread from "@/components/layout/NavbarUnread";
import TabTitleNotifier from "@/components/layout/TabTitleNotifier";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import PostHogUserIdentification from "@/components/providers/PostHogUserIdentification";
import { isPro } from "@/lib/pro";

// Fetches the same two unread-count RPCs NavbarUnread uses (dm inbox +
// notifications) so the tab title can show a combined badge. Its own
// Suspense boundary for the same reason NavbarUnread has one: decoration,
// must never block the app shell on a slow count RPC.
async function TabTitleUnread() {
  const supabase = await createClient();
  const [{ data: dmUnread }, { data: notificationUnread }] = await Promise.all([
    supabase.rpc("get_dm_unread_total"),
    supabase.rpc("get_notification_unread_total"),
  ]);
  return <TabTitleNotifier initialTotal={Number(dmUnread ?? 0) + Number(notificationUnread ?? 0)} />;
}

// Wraps every authed page (feed, dashboard, profile, post, edit) with the nav.
// The proxy already gates these routes; this just needs the username for the
// profile link.
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
      {/* Unread DM/notification counts are decoration, not part of the auth
          gate — fetch them in their own Suspense boundary so a slow RPC never
          blocks the rest of the app shell. Fallback is the same Navbar with
          0 counts, which renders the bell/inbox icons with no badge. */}
      <Suspense fallback={<Navbar {...navbarProps} dmUnread={0} notificationUnread={0} />}>
        <NavbarUnread {...navbarProps} />
      </Suspense>
      {user && (
        <Suspense fallback={null}>
          <TabTitleUnread />
        </Suspense>
      )}
      {children}
    </ThemeProvider>
  );
}
