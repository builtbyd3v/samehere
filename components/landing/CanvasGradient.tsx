/** Warm radial wash — shared by landing + auth shells. Two blobs drift on
 *  opposite phases for a slow ambient breathe (CSS only, reduced-motion safe). */
export default function CanvasGradient({ height = "min(100%, 920px)" }: { height?: string }) {
  return (
    <div className="canvas-wash pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height }} aria-hidden>
      <span className="canvas-blob canvas-blob-a absolute inset-0" />
      <span className="canvas-blob canvas-blob-b absolute inset-0" />
    </div>
  );
}
