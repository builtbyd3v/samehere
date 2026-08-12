import SameHereMark from "@/components/SameHereMark";

export default function LandingNavBrand() {
  return (
    <span className="landing-nav-brand" aria-hidden>
      <span className="landing-nav-brand-wordmark">
        <span>same</span>
        <span>here</span>
      </span>
      <span className="landing-nav-brand-mark">
        <SameHereMark className="size-7" />
      </span>
    </span>
  );
}
