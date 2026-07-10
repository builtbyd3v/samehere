// Deterministic gradient + initials — replaces external picsum avatars so the
// landing page has zero third-party image requests and no load flash.
function hueFrom(seed: string): number {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function DemoAvatar({
  seed,
  name,
  className = "h-8 w-8 text-[11px]",
}: {
  seed: string;
  name: string;
  className?: string;
}) {
  const h = hueFrom(seed);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`grid shrink-0 select-none place-items-center rounded-full border border-[var(--border)] font-semibold text-white ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${h} 52% 52%), hsl(${(h + 42) % 360} 58% 42%))`,
      }}
    >
      {initials}
    </span>
  );
}
