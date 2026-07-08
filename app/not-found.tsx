import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-5 py-10">
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">Page not found</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          That page doesn&apos;t exist, or it moved.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <Link href="/" className="btn-primary">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
