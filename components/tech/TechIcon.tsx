/**
 * Accessible technology mark for Project Studio.
 * Maps known labels to vendored Devicon SVGs; unknown concepts stay text-only.
 */

import { resolveTechIconSrc } from "@/components/tech/tech-icons";

export type TechIconProps = {
  /** Display name, e.g. "TypeScript", "Next.js", "REST". */
  label: string;
  /** Icon edge length in pixels. */
  size?: number;
  /** When true (default), render the visible text label beside the mark. */
  showLabel?: boolean;
  className?: string;
};

export { resolveTechIconSrc };

export default function TechIcon({
  label,
  size = 20,
  showLabel = true,
  className,
}: TechIconProps) {
  const trimmed = label.trim();
  const src = resolveTechIconSrc(trimmed);
  const accessibleName = trimmed || "Technology";

  if (!src) {
    return (
      <span className={className} data-tech-fallback="" title={accessibleName}>
        <span>{accessibleName}</span>
      </span>
    );
  }

  return (
    <span className={className} title={accessibleName}>
      {/* Local SVG marks — next/image adds little for static icons. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        decoding="async"
        aria-hidden={showLabel ? true : undefined}
      />
      {showLabel ? (
        <span>{accessibleName}</span>
      ) : (
        <span className="sr-only">{accessibleName}</span>
      )}
    </span>
  );
}
