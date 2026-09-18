// Source: https://www.beautifului.dev/ — Drive pixel grid adapted to SameHere
// tokens. One-shot / stage-bounded only. No elapsed timer, no looping shimmer.
import "./loading-state.css";

const chevron = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

export default function LoadingState({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div className="landing-loading-state" data-active={active || undefined}>
      <span aria-hidden className="landing-loading-pixels">
        {chevron.map((delay, index) => (
          <span
            key={index}
            className="landing-loading-pixel"
            style={
              active
                ? { animationDelay: `${delay}ms` }
                : undefined
            }
          />
        ))}
      </span>
      <span className="landing-loading-label">{label}</span>
    </div>
  );
}
