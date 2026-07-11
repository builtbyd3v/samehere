export type DmInboxRow = {
  conversation_id: string;
  peer_id: string;
  peer_username: string;
  peer_display_name: string | null;
  peer_avatar_url: string | null;
  peer_is_pro: boolean;
  last_message: string;
  last_message_at: string;
  last_sender_id: string | null;
  unread_count: number;
};

export type DmMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type GroupMember = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type GroupInboxRow = {
  conversation_id: string;
  title: string;
  members: GroupMember[];
  last_message: string;
  last_message_at: string;
  last_sender_id: string | null;
  unread_count: number;
};

/** Unified inbox row: a 1:1 DM (list_dm_inbox, unchanged contract) or a group
 * (list_group_inbox, new). Kept as a parallel type rather than widening
 * DmInboxRow -- see plan 025 NOTES for why list_dm_inbox itself was not touched. */
export type InboxThread =
  | ({ kind: "dm" } & DmInboxRow)
  | ({ kind: "group" } & GroupInboxRow);

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
