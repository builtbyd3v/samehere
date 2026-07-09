import type { PostMedia } from "@/lib/media";

// Static grid, no lightbox/carousel. // ponytail: add a lightbox only if users ask.
// ponytail: plain <img>, not next/image. media.url is a signed URL re-minted on
// every server render (see lib/media.ts), so the optimizer would key on a src
// that never repeats — zero cache hits, one paid optimization per request, no
// benefit. Avatars use next/image because their URLs are stable. Revisit only if
// post media moves to stable public URLs.
export default function PostMediaGrid({ media, compact = false }: { media: PostMedia[]; compact?: boolean }) {
  const mt = compact ? "mt-3" : "mt-4";
  if (media.length === 1) {
    const m = media[0];
    return (
      <div className={`${mt} overflow-hidden rounded-xl border border-[var(--border)]`}>
        {m.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL, optimizer never caches
          <img src={m.url} alt="" loading="lazy" decoding="async" className="max-h-[420px] w-full object-cover" />
        ) : (
          <video src={m.url} controls preload="metadata" className="max-h-[420px] w-full" />
        )}
      </div>
    );
  }

  return (
    <div className={`${mt} grid grid-cols-2 gap-1 overflow-hidden rounded-xl border border-[var(--border)]`}>
      {media.map((m, i) =>
        m.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL, optimizer never caches
          <img
            key={i}
            src={m.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <video key={i} src={m.url} controls preload="metadata" className="aspect-square w-full object-cover" />
        ),
      )}
    </div>
  );
}
