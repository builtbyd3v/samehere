import Link from "next/link";

export default function PostNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="rounded-xl border border-[var(--border)] p-10 text-center">
        <p className="text-lg font-semibold tracking-[-0.02em]">Post not found</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          This post doesn&rsquo;t exist, or you don&rsquo;t have access to it.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <Link
            href="/feed"
            className="btn-inset rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--canvas)] transition active:opacity-80"
          >
            Back to feed
          </Link>
        </div>
      </div>
    </main>
  );
}
