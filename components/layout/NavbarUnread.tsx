import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";

// Fetches the two unread-count RPCs (DM inbox + notifications) and renders
// Navbar with real numbers. Split out so layout.tsx can wrap just this in
// <Suspense> — the counts are decoration, not part of the auth gate — instead
// of blocking the whole app shell on them. Both RPCs self-guard on auth.uid()
// being null (return 0), so this only needs the profile-derived props.
export default async function NavbarUnread(props: {
  username: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  isAdmin: boolean;
}) {
  const supabase = await createClient();
  const [{ data: dmUnread }, { data: notificationUnread }] = await Promise.all([
    supabase.rpc("get_dm_unread_total"),
    supabase.rpc("get_notification_unread_total"),
  ]);

  return (
    <Navbar
      {...props}
      dmUnread={Number(dmUnread ?? 0)}
      notificationUnread={Number(notificationUnread ?? 0)}
    />
  );
}
