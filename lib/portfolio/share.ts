import { SITE_URL } from "@/lib/site";

export function profileSharePath(username: string): string {
  return `/profile/${username}`;
}

export function profileShareUrl(username: string): string {
  return `${SITE_URL}${profileSharePath(username)}`;
}
