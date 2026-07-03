"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="rounded-xl border border-[var(--border)] p-10 text-center">
        <p className="text-lg font-semibold tracking-[-0.02em]">Something went wrong</p>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          Give it another try.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={reset}
            className="btn-inset rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--canvas)] transition active:opacity-80"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
