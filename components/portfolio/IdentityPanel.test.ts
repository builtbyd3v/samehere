import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IdentityPanel from "./IdentityPanel";

type Props = ComponentProps<typeof IdentityPanel>;

const base: Props = {
  username: "ada",
  displayName: "Ada",
  avatarUrl: null,
  pro: false,
  badges: { isPro: false, isFounder: false, isCampusFounder: false, isVerifiedStudent: false, isBot: false },
  headline: null,
  tagline: null,
  stage: null,
  focusAreas: [],
  schoolLine: null,
  openTo: [],
  inviteDm: false,
  links: null,
  actions: null,
};

const render = (over: Partial<Props>) => renderToStaticMarkup(createElement(IdentityPanel, { ...base, ...over }));

describe("IdentityPanel counts", () => {
  it("uses singular words for one", () => {
    const html = render({ counts: { posts: 1, followers: 1, following: 1 } });
    expect(html).toContain("follower<");
    expect(html).toContain("post<");
    expect(html).not.toContain("followers<");
    expect(html).not.toContain("posts<");
  });

  it("uses plural words otherwise", () => {
    const html = render({ counts: { posts: 2, followers: 2, following: 0 } });
    expect(html).toContain("followers<");
    expect(html).toContain("posts<");
  });

  it("never colors counts with the Pro accent", () => {
    const html = render({ counts: { posts: 2, followers: 2, following: 0 } });
    const counts = html.slice(html.indexOf("/profile/ada/followers"));
    expect(counts).not.toContain("profile-accent");
  });
});

describe("IdentityPanel table", () => {
  it("lists badges in a Badges row", () => {
    const html = render({ badges: { isVerifiedStudent: true, isPro: true } });
    expect(html).toContain("Badges");
    expect(html).toMatch(/<dd[^>]*>Verified student · Pro<\/dd>/);
  });

  it("hides the table on phones without school, badges, or open-to", () => {
    const html = render({});
    expect(!html.includes("<dl") || /<dl class="hidden xl:flex/.test(html)).toBe(true);
  });
});

describe("IdentityPanel helped line", () => {
  it("renders nothing at 0", () => {
    expect(render({ helped: 0 })).not.toContain("Helped");
  });

  it("uses the singular for one student", () => {
    const html = render({ helped: 1 });
    expect(html).toContain("Helped");
    expect(html).toContain(">1<");
    expect(html).toContain("student<");
    expect(html).not.toContain("students");
  });

  it("uses the plural otherwise", () => {
    const html = render({ helped: 12 });
    expect(html).toContain(">12<");
    expect(html).toContain("students<");
  });
});
