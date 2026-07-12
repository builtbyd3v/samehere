import { getUnreadCounts } from "@/lib/unread";
import MobileNav from "./MobileNav";

// Server wrapper: same request-cached unread counts as LeftNavUnread (React
// cache() dedupes to one pair of RPCs), handed to the mobile bar for its
// Messages/Notifications dots.
export default async function MobileNavUnread({ username }: { username: string | null }) {
  if (!username) return <MobileNav username={username} />;
  const { dm, notif } = await getUnreadCounts();
  return <MobileNav username={username} dmUnread={dm} notifUnread={notif} />;
}
