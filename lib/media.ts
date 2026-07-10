import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type PostMedia = { path: string; type: "image" | "video"; url: string };
type RawMedia = { path: string; type: "image" | "video" };
const TTL = 3600; // 1h — outlives a page view; media is re-signed on next load.

// Private bucket: post-RLS already decided the viewer may see these posts, so we
// mint signed URLs for their media. One batched createSignedUrls call.
export async function attachSignedMedia<T extends { media: unknown }>(
  supabase: SupabaseClient<Database>,
  posts: T[],
): Promise<(Omit<T, "media"> & { media: PostMedia[] })[]> {
  const paths = posts.flatMap((p) => ((p.media as RawMedia[] | null) ?? []).map((m) => m.path));
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("post-media").createSignedUrls(paths, TTL);
    for (const d of data ?? []) if (d.signedUrl && d.path) signed.set(d.path, d.signedUrl);
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
  for (const m of media) {
    const fileName = m.path.slice(userId.length + 1);
    const { data } = await supabase.storage.from("post-media").list(userId, { search: fileName });
    const obj = data?.find((f) => f.name === fileName);
    if (!obj) return "Media upload not found. Try again.";
    const meta = (obj.metadata ?? {}) as { size?: number; mimetype?: string };
    if (!MEDIA_MIME[m.type].includes(meta.mimetype ?? "")) return "Unsupported media type.";
    if ((meta.size ?? 0) > MEDIA_LIMITS[m.type]) {
      return m.type === "image" ? "Images must be under 8 MB." : "Videos must be under 100 MB.";
    }
  }
  return null;
}
