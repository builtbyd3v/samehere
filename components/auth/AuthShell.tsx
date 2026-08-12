"use client";

import Link from "next/link";

// Landing-aligned auth chrome: dark .landing-xai tokens, white CTAs, blue accent.
function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--accent-blue-strong)]">{children}</span>;
}

const COPY = {
  login: {
    headline: (
      <>
        Welcome <Accent>back</Accent>.
      </>
    ),
    sub: "Pick up your internship path where you left off.",
  },
  signup: {
    headline: (
      <>
        From zero to <Accent>internship</Accent>.
      </>
    ),
    sub: "An adaptive coach that redesigns itself around where you're stuck.",
  },
  forgot: {
    headline: (
      <>
        Locked <Accent>out</Accent>?
      </>
    ),
    sub: "We'll send a link to get you back in.",
  },
  updatePassword: {
    headline: (
      <>
        New <Accent>password</Accent>.
      </>
    ),
    sub: "Almost back in.",
  },
};

type Props = {
  variant: keyof typeof COPY;
  children: React.ReactNode;
  footer: React.ReactNode;
  aside?: React.ReactNode;
  asideExtra?: React.ReactNode;
};

export default function AuthShell({ variant, children, footer, aside, asideExtra }: Props) {
  const { headline, sub } = COPY[variant];

  return (
    <main className="landing-xai path-app relative min-h-[100dvh] overflow-hidden">
      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col px-5 py-6 md:py-12 lg:px-8">
        <Link
          href="/"
          className="text-lg font-medium tracking-[-0.03em]"
          aria-label="samehere home"
        >
          <span className="text-[var(--ink)]">same</span>
          <span className="text-[var(--accent-blue-strong)]">here</span>
        </Link>

        <div className="mt-4 flex flex-1 flex-col justify-center gap-5 md:mt-12 md:grid md:grid-cols-2 md:items-center md:gap-16 lg:gap-20">
          <div className="max-w-md">
            <h2 className="text-balance text-[25px] font-medium leading-[1.05] tracking-[-0.03em] md:text-[40px] lg:text-[44px] lg:tracking-[-0.04em]">
              {headline}
            </h2>
            <p className="mt-4 hidden max-w-[36ch] text-base leading-relaxed text-[var(--ink-muted)] md:block md:text-lg">
              {sub}
            </p>
            {aside}
            {asideExtra && <div className="mt-6 hidden md:block">{asideExtra}</div>}
          </div>

          <div className="page-enter flex flex-col items-start md:items-center md:justify-center">
            {children}
            <div className="mt-4 w-full max-w-md text-sm text-[var(--ink-muted)]">{footer}</div>
            {asideExtra && <div className="mt-6 w-full max-w-md md:hidden">{asideExtra}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
