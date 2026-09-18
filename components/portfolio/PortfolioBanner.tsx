import Image from "next/image";
import { portfolioBannerCss } from "@/lib/portfolio/banner";
import { isSupabaseStorageUrl } from "@/lib/storage-image";

const BANNER_SIZES = "(max-width: 672px) 100vw, 672px";

export default function PortfolioBanner({
  username,
  src,
  accent,
}: {
  username: string;
  src?: string | null;
  accent?: string | null;
}) {
  if (src) {
    return (
      <div className="relative aspect-[3/1] w-full overflow-hidden max-[390px]:aspect-[4/1]">
        {isSupabaseStorageUrl(src) ? (
          <Image src={src} alt="" fill sizes={BANNER_SIZES} className="object-cover" priority />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- host not in images.remotePatterns
          <img src={src} alt="" className="h-full w-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="surface-grain aspect-[4/1] w-full"
      style={{ background: portfolioBannerCss(username, accent) }}
    />
  );
}
