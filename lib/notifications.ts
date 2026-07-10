export type NotificationRow = {
  id: string;
  type: "follow" | "follow_request" | "comment" | "reaction" | "mention";
  post_id: string | null;
  // Set when the notification's source is a quote repost (its commentary, or a
  // comment on it). Those live at /quote/[id], not on the root post.
  repost_id: string | null;
  read: boolean;
  created_at: string;
  actor_id: string;
  actor_username: string;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  actor_is_pro: boolean;
  reaction_type: "like" | "samehere" | null;
};

export function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function notificationLabel(
  type: NotificationRow["type"],
  actorName: string,
  reactionType?: NotificationRow["reaction_type"],
): string {
  switch (type) {
    case "follow":
      return `${actorName} followed you`;
    case "follow_request":
      return `${actorName} requested to follow you`;
    case "comment":
      return `${actorName} commented on your post`;
    case "reaction":
      if (reactionType === "like") return `${actorName} liked your post`;
      if (reactionType === "samehere") return `${actorName} said SameHere on your post`;
      return `${actorName} reacted to your post`;
    case "mention":
      return `${actorName} mentioned you`;
  }
}

export function notificationHref(row: NotificationRow): string {
  const contentType = row.type === "comment" || row.type === "reaction" || row.type === "mention";
  // A quote repost's own page shows the commentary the user was mentioned in;
  // the root post does not. Prefer it when the row names one.
  if (contentType && row.repost_id) return `/quote/${row.repost_id}`;
  if (contentType && row.post_id) return `/post/${row.post_id}`;
  return `/profile/${row.actor_username}`;
}

/** Twitter-style badge cap for navbar counts. */
export function formatBadgeCount(n: number): string | null {
  if (n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}
