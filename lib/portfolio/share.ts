import { SITE_URL } from "@/lib/site";

export function profileSharePath(username: string): string {
  return `/profile/${username}`;
}

export function profileShareUrl(username: string, ref?: string): string {
  const url = `${SITE_URL}${profileSharePath(username)}`;
  return ref ? `${url}?ref=${encodeURIComponent(ref)}` : url;
}
