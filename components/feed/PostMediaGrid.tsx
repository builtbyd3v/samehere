import type { PostMedia } from "@/lib/media";

// Static grid, no lightbox/carousel. // ponytail: add a lightbox only if users ask.
export default function PostMediaGrid({ media }: { media: PostMedia[] }) {
  if (media.length === 1) {
    const m = media[0];
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border)]">
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
    <div className="mt-3 grid grid-cols-2 gap-1.5 overflow-hidden rounded-lg border border-[var(--border)]">
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
