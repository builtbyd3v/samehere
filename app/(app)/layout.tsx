import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import NavbarUnread from "@/components/layout/NavbarUnread";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import PostHogUserIdentification from "@/components/providers/PostHogUserIdentification";
import { isPro } from "@/lib/pro";

// Wraps every authed page (feed, dashboard, profile, post, edit) with the nav.
// The proxy already gates these routes; this just needs the username for the
// profile link.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("username, avatar_url, is_pro, is_admin").eq("id", user.id).single()
    : { data: null };

  const navbarProps = {
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isPro: profile ? isPro(profile) : false,
    isAdmin: profile?.is_admin ?? false,
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
      {children}
    </ThemeProvider>
  );
}
