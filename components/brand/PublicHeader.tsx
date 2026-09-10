import Link from "next/link";
import SameHereBrand from "./SameHereBrand";
import { signupCtaSm } from "@/components/landing/cta";

export default function PublicHeader({
  action = false,
}: {
  action?: boolean;
}) {
  return (
    <header className="public-header">
      <div className="brand-header-bar">
        <Link href="/" aria-label="samehere home" className="brand-link brand-link-settled">
          <SameHereBrand mode="settled" />
        </Link>
        {action ? (
          <Link href="/signup" className={signupCtaSm}>
            Join free
          </Link>
        ) : null}
      </div>
    </header>
  );
}
