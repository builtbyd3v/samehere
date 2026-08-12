type SameHereMarkProps = {
  className?: string;
  title?: string;
};

export default function SameHereMark({
  className,
  title,
}: SameHereMarkProps) {
  return (
    <svg
      viewBox="0 0 392 488"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <use href="/samehere-mark.svg#samehere-mark-path" fill="currentColor" />
    </svg>
  );
}
