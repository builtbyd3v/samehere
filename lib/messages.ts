import { parseTimestamp } from "@/lib/utils/time";

export type DmInboxRow = {
  conversation_id: string;
  peer_id: string;
  peer_username: string;
  peer_display_name: string | null;
  peer_avatar_url: string | null;
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

export function formatMessageTime(iso: string): string {
  const d = parseTimestamp(iso);
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
