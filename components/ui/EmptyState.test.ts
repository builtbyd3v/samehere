import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";

const render = (props: Parameters<typeof EmptyState>[0]) => renderToStaticMarkup(createElement(EmptyState, props));

describe("EmptyState", () => {
  it("renders no icon by default and the title in an h2", () => {
    const html = render({ title: "No saved posts yet" });
    expect(html).not.toContain("<svg");
    expect(html).toMatch(/<h2[^>]*>No saved posts yet<\/h2>/);
  });

  it("wraps a caller icon in an aria-hidden box", () => {
    const html = render({ title: "t", icon: createElement("svg", { "data-icon": "x" }) });
    expect(html).toMatch(/<div aria-hidden="true"[^>]*><svg data-icon="x"/);
  });

  it("renders actions as Button links, not legacy classes", () => {
    const html = render({ title: "t", action: { label: "Go to feed", href: "/feed" } });
    expect(html).toContain('href="/feed"');
    expect(html).not.toContain("btn-primary");
  });
});
