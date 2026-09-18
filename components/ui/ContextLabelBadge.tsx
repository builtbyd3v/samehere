import LabelGlyph from "./LabelGlyph";
import { CONTEXT_LABEL_COPY, type ContextLabel } from "@/lib/context-label";

export default function ContextLabelBadge({
  label,
  size = 12,
  drawIn = false,
  className = "",
}: {
  label: ContextLabel;
  size?: 12 | 14;
  drawIn?: boolean;
  className?: string;
}) {
  const copy = CONTEXT_LABEL_COPY[label];
  return (
    <span
      className={`context-label-badge${className ? ` ${className}` : ""}`}
      data-label={label}
      title={copy}
      aria-label={copy}
    >
      <LabelGlyph label={label} size={size} drawIn={drawIn} />
      <span className="context-label-text">{copy}</span>
    </span>
  );
}
