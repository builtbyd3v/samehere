import "./brand.css";

type SameHereBrandProps = {
  mode?: "animated" | "settled";
  title?: string;
};

export default function SameHereBrand({
  mode = "animated",
  title,
}: SameHereBrandProps) {
  return (
    <span className="samehere-brand" data-mode={mode} aria-hidden={title ? undefined : true}>
      <span className="samehere-brand-wordmark">
        <span>same</span>
        <span>here</span>
      </span>
      <span className="samehere-brand-mark">
        <svg
          viewBox="0 0 392 488"
          role={title ? "img" : undefined}
          aria-label={title}
          aria-hidden={title ? undefined : true}
        >
          <use href="/samehere-mark.svg#samehere-mark-path" fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}
