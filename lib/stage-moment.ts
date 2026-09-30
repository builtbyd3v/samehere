import { cookies } from "next/headers";
import { STAGE_MOMENT_COOKIE, encodeStageMoment, stageMomentFrom } from "@/lib/stage";

// Server only (next/headers). Called after a successful stage write; the feed
// shows the prompt once and clears the cookie (consumeStageMoment).
// ponytail: per-browser cookie, not a DB flag; a stage change made on another
// device prompts on that device only. Move to a profiles column if that matters.
export async function rememberStageMoment(prev: unknown, next: unknown): Promise<void> {
  const moment = stageMomentFrom(prev, next);
  if (!moment) return;
  const store = await cookies();
  store.set(STAGE_MOMENT_COOKIE, encodeStageMoment(moment), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
