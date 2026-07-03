/** Warm radial wash — shared by landing + auth shells */
export default function CanvasGradient({ height = "min(100%, 720px)" }: { height?: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 opacity-[0.5]"
      style={{
        height,
        background:
          "radial-gradient(50% 70% at 20% 0%, rgba(255,150,120,0.12), transparent 60%), radial-gradient(45% 65% at 85% 5%, rgba(120,170,255,0.1), transparent 55%)",
      }}
    />
  );
}
