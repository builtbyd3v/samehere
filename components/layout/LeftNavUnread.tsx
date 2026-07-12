import { getUnreadCounts } from "@/lib/unread";
import LeftNav from "./LeftNav";

// Server wrapper: reads the (request-cached) unread counts and hands them to the
// client LeftNav so Messages/Notifications show live badges. Wrapped in its own
// <Suspense> by the layout — badges are decoration, never block the shell.
export default async function LeftNavUnread({ username, isPro }: { username: string | null; isPro: boolean }) {
  if (!username) return <LeftNav username={username} isPro={isPro} />;
  const { dm, notif } = await getUnreadCounts();
  return <LeftNav username={username} isPro={isPro} dmUnread={dm} notifUnread={notif} />;
}
