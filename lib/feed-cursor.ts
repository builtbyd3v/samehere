// Composite keyset cursor: created_at + id, so two rows with an identical
// created_at at a page boundary neither drop nor duplicate across "Load
// more" pages. Encoded as "<created_at>|<id>" -- "|" never appears in an
// ISO-8601 timestamp or a uuid, so this is a safe, reversible delimiter.
//
// Used by /feed's loadMorePosts action (app/(app)/feed/actions.ts). /saved's
// loadMoreSaved keeps its own single-column (bookmark created_at) cursor --
// a different pagination source with a different bug class, out of scope here.
export type FeedCursor = { created_at: string; id: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Loose ISO-8601 timestamp check -- just strict enough to reject anything
// that could break out of a PostgREST `.or()` filter string (commas,
// parens, quotes). Not a full RFC 3339 validator; that's not the job here.
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function encodeCursor(created_at: string, id: string): string {
  return `${created_at}|${id}`;
}

// Returns null for anything not shaped like a valid composite cursor.
// Callers MUST treat null as "ignore the cursor" (or "no more pages") --
// never interpolate an unvalidated cursor string into a query filter.
// This matters because loadMorePosts(cursor) is a Server Action invoked
// from a Client Component (components/feed/FeedLoadMore.tsx) -- `cursor` is
// attacker-controlled input, and Step 1.4 below builds a PostgREST `.or()`
// filter string from its parts.
export function decodeCursor(cursor: string): FeedCursor | null {
  const i = cursor.lastIndexOf("|");
  if (i === -1) return null;
  const created_at = cursor.slice(0, i);
  const id = cursor.slice(i + 1);
  if (!ISO_RE.test(created_at) || !UUID_RE.test(id)) return null;
  return { created_at, id };
}
