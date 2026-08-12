import type { ReactNode } from "react";

/**
 * Shared top chrome metrics so the logo sits at the same viewport spot
 * on landing, auth, pricing, and the signed-in path app.
 */
export default function BrandChrome({
  children,
  center,
  right,
  below,
  scrolled = false,
  showDivider = true,
  className = "",
}: {
  /** Usually `<AppBrandLink />`. */
  children: ReactNode;
  /** Absolute-centered nav cluster (desktop). */
  center?: ReactNode;
  /** Right-side actions (Upgrade, avatar, CTAs). */
  right?: ReactNode;
  /** Mobile drawer / extras under the row, still inside the shell. */
  below?: ReactNode;
  scrolled?: boolean;
  /** Bottom hairline under the chrome (off on auth — logo only). */
  showDivider?: boolean;
  className?: string;
}) {
  const shellClass = showDivider
    ? scrolled
      ? "landing-nav-scrolled"
      : "landing-nav-shell"
    : "brand-chrome-shell--bare";

  return (
    <div
      className={`brand-chrome-shell relative mx-auto w-full max-w-[1280px] transition-[background-color,border-color] duration-200 ${shellClass} ${className}`}
    >
      <div className="brand-chrome-row relative flex h-16 items-center justify-between gap-4">
        <div className="brand-slot shrink-0">{children}</div>
        {center}
        {right}
      </div>
      {below}
    </div>
  );
}
