export type BrandMode = "animated" | "settled";

/** Persistent app header: intro once per full load, then settled. */
export function resolveBrandMode(opts: {
  played: boolean;
  reduceMotion: boolean;
}): BrandMode {
  if (opts.reduceMotion || opts.played) return "settled";
  return "animated";
}
