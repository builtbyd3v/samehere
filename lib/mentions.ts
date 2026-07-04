/** Match @username tokens (3–20 chars, same charset as profiles CHECK). */
const MENTION = /@([a-z0-9_]{3,20})/gi;

export type MentionPart = { type: "text"; value: string } | { type: "mention"; username: string };

export type ActiveMention = { query: string; start: number; end: number };

/** Mention being typed at the cursor (partial @handle). */
export function activeMentionAt(text: string, cursor: number): ActiveMention | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-z0-9_]*)$/i);
  if (!match) return null;
  return { query: match[1], start: cursor - match[0].length, end: cursor };
}

export function parseMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ type: "text", value: text.slice(last, idx) });
    parts.push({ type: "mention", username: m[1] });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length ? parts : [{ type: "text", value: text }];
}
