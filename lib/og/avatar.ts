import sharp from "sharp";

const MAX_BYTES = 2 * 1024 * 1024; // matches MAX_AVATAR_BYTES in profile/edit/actions.ts
const TIMEOUT_MS = 3000;

/** Only this project's public avatars bucket may be fetched server-side. */
export function isOwnAvatarUrl(src: string): boolean {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configured) return false;
  try {
    const base = new URL(configured);
    const url = new URL(src);
    return (
      url.protocol === base.protocol &&
      url.host === base.host &&
      url.pathname.startsWith("/storage/v1/object/public/avatars/")
    );
  } catch {
    return false;
  }
}

/** Fetch an avatar, square-crop it, and return a PNG data URI; null on any failure. */
export async function avatarDataUri(url: string | null, size: number): Promise<string | null> {
  if (!url || !isOwnAvatarUrl(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
    if (!res.ok) return null;
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return null;
    const png = await sharp(buf).resize(size, size, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
