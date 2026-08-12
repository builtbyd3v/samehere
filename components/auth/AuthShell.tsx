"use client";

import AppBrandLink from "@/components/brand/AppBrandLink";
import BrandChrome from "@/components/brand/BrandChrome";

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
      <header className="landing-nav landing-nav--bare fixed inset-x-0 top-0 z-50">
        <BrandChrome showDivider={false}>
          <AppBrandLink href="/" />
        </BrandChrome>
      </header>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1280px] flex-col px-4 pb-6 pt-[4.5rem] md:pb-12 lg:px-6">
        <div className="mt-4 flex flex-1 flex-col justify-center gap-5 md:mt-8 md:grid md:grid-cols-2 md:items-center md:gap-16 lg:gap-20">
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
