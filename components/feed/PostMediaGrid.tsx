import type { PostMedia } from "@/lib/media";

// Static grid, no lightbox/carousel. // ponytail: add a lightbox only if users ask.
export default function PostMediaGrid({ media, compact = false }: { media: PostMedia[]; compact?: boolean }) {
  const mt = compact ? "mt-3" : "mt-4";
  if (media.length === 1) {
    const m = media[0];
    return (
      <div className={`${mt} overflow-hidden rounded-xl border border-[var(--border)]`}>
        {m.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.url} alt="" loading="lazy" className="max-h-[420px] w-full object-cover" />
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
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={m.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        ) : (
          <video key={i} src={m.url} controls preload="metadata" className="aspect-square w-full object-cover" />
        ),
      )}
    </div>
  );
}
