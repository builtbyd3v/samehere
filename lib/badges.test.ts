import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import UserBadges from "@/components/profile/UserBadges";
import { activeBadges } from "./badges";

const ALL = { isPro: true, isFounder: true, isCampusFounder: true, isVerifiedStudent: true };
const render = (props: Parameters<typeof UserBadges>[0]) => renderToStaticMarkup(createElement(UserBadges, props));

describe("activeBadges", () => {
  it("is empty without flags", () => {
    expect(activeBadges({})).toEqual([]);
  });

  it("orders Verified student, Founder, Social Butterfly, Pro", () => {
    expect(activeBadges(ALL).map((b) => b.label)).toEqual(["Verified student", "Founder", "Social Butterfly", "Pro"]);
  });

  it("puts Founder before Pro", () => {
    expect(activeBadges({ isPro: true, isFounder: true })[0].label).toBe("Founder");
  });
});

describe("UserBadges", () => {
  it("renders one mark labeled with every badge", () => {
    const html = render(ALL);
    expect(html.match(/<svg/g)?.length).toBe(1);
    expect(html).toContain('aria-label="Verified student, Founder, Social Butterfly, Pro"');
  });

  it("always shows the Bot label, with no mark when there are no badges", () => {
    const html = render({ isBot: true });
    expect(html).toContain("Bot");
    expect(html).not.toContain("<svg");
  });

  it("renders nothing without flags", () => {
    expect(render({})).toBe("");
  });

  it("is monochrome", () => {
    const html = render(ALL);
    for (const token of ["--founder", "--campus-founder", "--blue"]) expect(html).not.toContain(token);
  });
});
