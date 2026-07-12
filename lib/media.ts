import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export type PostMedia = { path: string; type: "image" | "video"; url: string };
type RawMedia = { path: string; type: "image" | "video" };
const TTL = 3600; // 1h — outlives a page view; media is re-signed on next load.

const CACHE_REVALIDATE = 3000; // 50min — must stay safely under TTL (3600s)
// below, so a cache entry can never outlive the signed URL it stored (600s
// safety margin). If TTL ever changes, keep this at least 600s under it.

// Per-path cache: unstable_cache's cache key includes this callback's actual
// call arguments (not just the ["post-media-signed-url"] key below), so
// calling this with one path string yields ONE cache entry per distinct
// path — a brand-new post's paths are the only misses; every other path
// already in cache is a hit, regardless of which arbitrary batch of posts
// they show up alongside on a given render. See lib/leaderboard.ts and
// lib/founder.ts for this repo's other unstable_cache usages.
//
// Signs via the ADMIN (service-role) client, not the per-viewer session
// client passed into attachSignedMedia below — unstable_cache callbacks
// cannot depend on the current request's cookies/session (see
// lib/founder.ts's comment on the same constraint), and a cache entry
// shared across viewers must produce the same URL for all of them, which
// only works if signing doesn't depend on who's asking.
//
// SAFETY INVARIANT — READ BEFORE ADDING A NEW CALLER: this bypasses the
// per-viewer storage RLS policy ("post-media visible via parent post",
// supabase/migrations/20260711100100_post_media_visible_via_parent_post.sql)
// that would otherwise re-check visibility at sign time. That is safe ONLY
// because this function is called exclusively from attachSignedMedia below,
// which only ever receives `posts` rows already fetched through an
// RLS-gated `public.posts` select (the storage policy re-derives that exact
// same visibility rule independently — this collapses two redundant checks
// into one). NEVER call signPath, or add a new attachSignedMedia call site,
// with a path that did not come from an RLS-gated posts query — doing so
// would turn this cache into an unrestricted read primitive over the entire
// private post-media bucket.
const signPath = unstable_cache(
  async (path: string): Promise<string | null> => {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("post-media").createSignedUrls([path], TTL);
    return data?.[0]?.signedUrl ?? null;
  },
  ["post-media-signed-url"],
  { revalidate: CACHE_REVALIDATE },
);

// Private bucket: post-RLS already decided the viewer may see these posts —
// see the SAFETY INVARIANT comment on signPath above for why it's then safe
// to sign via a shared, admin-signed cache. `supabase` is unused for signing
// now (kept as a parameter so none of this function's 10 call sites need to
// change) — prefixed with `_` to satisfy the unused-var lint rule.
export async function attachSignedMedia<T extends { media: unknown }>(
  _supabase: SupabaseClient<Database>,
  posts: T[],
): Promise<(Omit<T, "media"> & { media: PostMedia[] })[]> {
  const paths = posts.flatMap((p) => ((p.media as RawMedia[] | null) ?? []).map((m) => m.path));
  const uniquePaths = [...new Set(paths)];
  const signed = new Map<string, string>();
  if (uniquePaths.length > 0) {
    const urls = await Promise.all(uniquePaths.map((p) => signPath(p)));
    uniquePaths.forEach((p, i) => {
      const url = urls[i];
      if (url) signed.set(p, url);
    });
  }
  return posts.map((p) => ({
    ...p,
    media: ((p.media as RawMedia[] | null) ?? [])
      .map((m) => ({ ...m, url: signed.get(m.path) ?? "" }))
      .filter((m) => m.url), // drop any that failed to sign
  }));
}

// Server-side backstop for the client-enforced per-type size caps: the
// post-media bucket only sets one flat 100MB limit for every mimetype, so the
// 8MB image cap is otherwise UI-only and a direct-API caller could store a
// 100MB "image". Re-checks each already-uploaded path's real size/mimetype
// (as recorded by Supabase Storage) before the post is allowed to reference
// it. Returns an error string, or null when every path is within limits.
const MEDIA_LIMITS: Record<"image" | "video", number> = {
  image: 8 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};
const MEDIA_MIME: Record<"image" | "video", string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm"],
};

export async function verifyMediaLimits(
  supabase: SupabaseClient<Database>,
  userId: string,
  media: RawMedia[],
): Promise<string | null> {
  const { data } = await supabase.storage
    .from("post-media")
    .list(userId, { sortBy: { column: "created_at", order: "desc" } });
  const byName = new Map((data ?? []).map((f) => [f.name, f]));

  for (const m of media) {
    const fileName = m.path.slice(userId.length + 1);
    const obj = byName.get(fileName);
    if (!obj) return "Media upload not found. Try again.";
    const meta = (obj.metadata ?? {}) as { size?: number; mimetype?: string };
    if (!MEDIA_MIME[m.type].includes(meta.mimetype ?? "")) return "Unsupported media type.";
    if ((meta.size ?? 0) > MEDIA_LIMITS[m.type]) {
      return m.type === "image" ? "Images must be under 8 MB." : "Videos must be under 100 MB.";
    }
  }
  return null;
}
