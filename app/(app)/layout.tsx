import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { isPro } from "@/lib/pro";

// Wraps every authed page (feed, dashboard, profile, post, edit) with the nav.
// The proxy already gates these routes; this just needs the username for the
// profile link.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: dmUnread }, { data: notificationUnread }] = user
    ? await Promise.all([
        supabase.from("profiles").select("username, avatar_url, is_pro").eq("id", user.id).single(),
        supabase.rpc("get_dm_unread_total"),
        supabase.rpc("get_notification_unread_total"),
      ])
    : [{ data: null }, { data: 0 }, { data: 0 }];

  return (
    <ThemeProvider>
      <Navbar
        username={profile?.username ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        isPro={profile ? isPro(profile) : false}
        dmUnread={Number(dmUnread ?? 0)}
        notificationUnread={Number(notificationUnread ?? 0)}
      />
      {children}
    </ThemeProvider>
  );
}
