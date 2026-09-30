import { Children, type ReactNode } from "react";

// One wrapper per feed item, no entrance motion: DESIGN.md keeps motion off
// daily surfaces, so feed items render in place on first paint.
export default function FeedStagger({ children }: { children: ReactNode }) {
  return <>{Children.map(children, (child) => <div>{child}</div>)}</>;
}
