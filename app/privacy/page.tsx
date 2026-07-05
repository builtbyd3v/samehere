import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="page-enter mx-auto min-h-screen max-w-2xl bg-[var(--canvas)] px-5 py-20 text-[var(--ink)]">
      <h1 className="text-[36px] font-semibold leading-tight tracking-[-0.025em]">Privacy Policy</h1>
      <p className="mt-5 text-base leading-relaxed text-[var(--ink-muted)]">
        Full privacy policy is being finalized before public launch. This page will be updated with how we
        collect, use, and protect your data.
      </p>
      <Link
        href="/"
        className="mt-10 inline-block text-sm text-[var(--ink)] underline-offset-4 transition hover:underline"
      >
        Back to home
      </Link>
    </main>
  );
}
