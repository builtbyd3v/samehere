import Link from "next/link";

export default function PostNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="card px-6 py-16 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--featured-surface)] text-[var(--ink-faint)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 10.5c0-1.4 1.2-2.5 3-2.5s3 1 3 2.2c0 1.6-1.8 1.9-2.6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
          </svg>
        </div>
        <p className="mt-4 font-medium text-[var(--ink)]">Post not found</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          This post doesn&rsquo;t exist, or you don&rsquo;t have access to it.
        </p>
        <div className="mt-5 flex items-center justify-center">
          <Link href="/feed" className="btn-primary">
            Back to feed
          </Link>
        </div>
      </div>
    </main>
  );
}
