import { getUnreadCounts } from "@/lib/unread";
import LeftNav, { type ShellUser } from "./LeftNav";

// Server wrapper: reads the (request-cached) unread counts and hands them to the
// client LeftNav so Messages/Notifications show live badges. Wrapped in its own
// <Suspense> by the layout — badges are decoration, never block the shell.
export default async function LeftNavUnread({ user }: { user: ShellUser }) {
  if (!user.username) return <LeftNav user={user} />;
  const { dm, notif } = await getUnreadCounts();
  return <LeftNav user={user} dmUnread={dm} notifUnread={notif} />;
}
