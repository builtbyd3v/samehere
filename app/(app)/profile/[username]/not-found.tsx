import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <main className="page-enter mx-auto max-w-2xl px-5 py-10">
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold tracking-[-0.02em]">Profile not found</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          This student doesn&rsquo;t exist, or the link is broken.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/feed" className="btn-primary">
            Back to feed
          </Link>
          <Link href="/search" className="btn-ghost">
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
