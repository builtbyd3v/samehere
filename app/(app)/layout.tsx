import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
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
    ? await supabase.from("profiles").select("username, avatar_url, is_pro").eq("id", user.id).single()
    : { data: null };

  return (
    <>
      <Navbar
        username={profile?.username ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        isPro={profile ? isPro(profile) : false}
      />
      {children}
    </>
  );
}
