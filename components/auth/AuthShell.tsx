"use client";

import AppBrand from "@/components/brand/AppBrand";

const COPY = {
  login: {
    headline: "Welcome back.",
    sub: "Jump back into your feed.",
  },
  signup: {
    headline: "You’re not the only one.",
    sub: "Built for students. Takes a minute.",
  },
  forgot: {
    headline: "Locked out?",
    sub: "We’ll send a link to get you back in.",
  },
  updatePassword: {
    headline: "New password.",
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
    <main className="auth-shell">
      <header className="brand-header-bar">
        <AppBrand href="/" />
      </header>

      <div className={asideExtra ? "auth-split" : "auth-focus"}>
        <div className="auth-copy">
          <h2>{headline}</h2>
          <p className="auth-sub">{sub}</p>
          {aside}
          {asideExtra ? <div className="auth-aside-desktop">{asideExtra}</div> : null}
        </div>

        <div className="auth-form">
          {children}
          <div className="auth-footer">{footer}</div>
          {asideExtra ? <div className="auth-aside-mobile">{asideExtra}</div> : null}
        </div>
      </div>
    </main>
  );
}
