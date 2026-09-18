import type { ContextLabel } from "@/lib/context-label";

type LabelGlyphProps = {
  label: ContextLabel;
  size?: 12 | 14;
  drawIn?: boolean;
};

function StuckGlyph() {
  return (
    <path
      className="label-glyph-stroke"
      d="M11 6 A5 5 0 1 1 6 1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  );
}

function BuildingGlyph() {
  return (
    <>
      <circle
        className="label-glyph-stroke"
        cx="6"
        cy="6"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path className="label-glyph-fill" d="M6 6 L6 1 A5 5 0 0 1 6 11 Z" fill="currentColor" />
    </>
  );
}

function LearningGlyph() {
  return (
    <circle
      className="label-glyph-stroke"
      cx="6"
      cy="6"
      r="5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="5.5 2.354"
      strokeLinecap="round"
    />
  );
}

export default function LabelGlyph({ label, size = 12, drawIn = false }: LabelGlyphProps) {
  return (
    <svg
      className={drawIn ? "label-glyph label-glyph-draw" : "label-glyph"}
      data-label={label}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden
    >
      {label === "stuck" ? <StuckGlyph /> : null}
      {label === "building" ? <BuildingGlyph /> : null}
      {label === "learning" ? <LearningGlyph /> : null}
    </svg>
  );
}
