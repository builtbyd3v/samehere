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
