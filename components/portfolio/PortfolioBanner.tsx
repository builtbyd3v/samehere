import { portfolioBannerCss } from "@/lib/portfolio/banner";

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
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="aspect-[3/1] w-full object-cover sm:aspect-[3/1] max-[390px]:aspect-[4/1]" />
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
