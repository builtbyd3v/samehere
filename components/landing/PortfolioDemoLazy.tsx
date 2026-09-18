"use client";

import dynamic from "next/dynamic";

const PortfolioDemo = dynamic(() => import("./PortfolioDemo"), {
  ssr: false,
  loading: () => (
    <div
      className="landing-portfolio-demo-shell"
      style={{ minHeight: "22rem" }}
      aria-hidden
    />
  ),
});

export default function PortfolioDemoLazy() {
  return <PortfolioDemo />;
}
