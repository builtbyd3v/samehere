import { describe, expect, it } from "vitest";
import { parseDigestContent, weeklyDigestEmail, type DigestContent } from "./weekly-digest";

const UNSUB = "https://www.samehere.dev/api/email/unsubscribe?u=tok";

const person = (n: number) => ({ username: `user${n}`, display_name: `User ${n}`, stage: "building" });
const question = (n: number) => ({ id: `post-${n}`, excerpt: `question ${n}`, username: `asker${n}`, display_name: null });

function render(content: DigestContent) {
  const email = weeklyDigestEmail(content, UNSUB);
  if (!email) throw new Error("expected an email");
  return email;
}

describe("weeklyDigestEmail", () => {
  it("returns null for an empty week", () => {
    expect(weeklyDigestEmail({ people: [], questions: [], views: null }, UNSUB)).toBeNull();
    expect(weeklyDigestEmail({ people: [], questions: [], views: 0 }, UNSUB)).toBeNull();
  });

  it("caps people and questions and counts only what renders", () => {
    const content = parseDigestContent({
      people: [1, 2, 3, 4, 5].map(person),
      questions: [1, 2, 3, 4].map(question),
      views_7d: null,
    });
    expect(content.people).toHaveLength(3);
    expect(content.questions).toHaveLength(2);
    const { subject } = render(content);
    expect(subject).toContain("3 new people at your stage");
    expect(subject).toContain("2 open questions you could answer");
  });

  it("uses singular forms", () => {
    const { subject, html } = render(parseDigestContent({ people: [person(1)], questions: [question(1)], views_7d: 1 }));
    expect(subject).toBe(
      "this week on samehere: 1 new person at your stage, 1 open question you could answer, 1 portfolio view"
    );
    expect(html).toContain("your portfolio got 1 view in the last 7 days");
  });

  it("escapes user-written text in html", () => {
    const { html } = render({
      people: [{ username: "evil", displayName: "<script>x</script>", stage: null }],
      questions: [{ id: "p1", excerpt: 'a & b "c"', username: "asker", displayName: null }],
      views: null,
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b &quot;c&quot;");
    expect(html).not.toContain("<script>");
  });

  it("shows the views line only when views > 0", () => {
    const people = [{ username: "ada", displayName: null, stage: null }];
    expect(render({ people, questions: [], views: 12 }).html).toContain("your portfolio got 12 views in the last 7 days");
    expect(render({ people, questions: [], views: 0 }).html).not.toContain("your portfolio got");
    expect(render({ people, questions: [], views: null }).text).not.toContain("your portfolio got");
    expect(render({ people: [], questions: [], views: 3 }).subject).toBe("this week on samehere: 3 portfolio views");
  });

  it("links every person, question, the feed, and the unsubscribe URL", () => {
    const { html, text } = render(parseDigestContent({ people: [person(1), person(2)], questions: [question(7)], views_7d: null }));
    expect(html).toContain("/profile/user1");
    expect(html).toContain("/profile/user2");
    expect(html).toContain("/post/post-7");
    expect(html).toContain("/feed");
    expect(html).toContain(UNSUB);
    expect(text).toContain(UNSUB);
  });

  it("cuts a long excerpt to 139 characters plus ...", () => {
    const raw = "x".repeat(200);
    const expected = `${"x".repeat(139)}...`;
    expect(expected).toHaveLength(142);
    const { html, text } = render({ people: [], questions: [{ id: "p1", excerpt: raw, username: "a", displayName: null }], views: null });
    expect(text).toContain(`${expected} from a`);
    expect(html).toContain(`${expected}</a>`);
    expect(text).not.toContain("x".repeat(140));
  });

  it("never emits an em dash", () => {
    const { subject, text, html } = render(parseDigestContent({ people: [person(1)], questions: [question(1)], views_7d: 4 }));
    expect(subject + text + html).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("parseDigestContent", () => {
  it("drops malformed entries and non-array input", () => {
    const c = parseDigestContent({
      people: [null, "ada", { display_name: "No Username" }, { username: "ok", display_name: 5 }],
      questions: [null, { id: "p1", username: "a" }, { id: 1, excerpt: "e", username: "a" }],
      views_7d: null,
    });
    expect(c.people).toEqual([{ username: "ok", displayName: null, stage: null }]);
    expect(c.questions).toEqual([]);
    expect(parseDigestContent({ people: "nope", questions: { a: 1 }, views_7d: -1 })).toEqual({
      people: [],
      questions: [],
      views: null,
    });
  });
});
