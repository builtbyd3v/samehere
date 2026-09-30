import Image from "next/image";
import { isSupabaseStorageUrl } from "@/lib/storage-image";

/** Pro banner as a faded backdrop behind the portfolio header. */
export default function PortfolioBanner({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]">
      {isSupabaseStorageUrl(src) ? (
        <Image src={src} alt="" fill sizes="100vw" className="object-cover" priority />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- host not in images.remotePatterns
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  );
}
