/** True when `src` is on this app's Supabase storage host (next/image allowlist). */
export function isSupabaseStorageUrl(src: string): boolean {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configured) return false;
  try {
    const allowed = new URL(configured).hostname;
    const url = new URL(src, configured);
    return url.hostname === allowed && url.pathname.includes("/storage/v1/object/");
  } catch {
    return false;
  }
}
