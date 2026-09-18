import { describe, expect, it } from "vitest";
import { CTA, ERROR, feed, messages, profile, search } from "./copy-voice";

describe("copy voice — empty / error", () => {
  it("keeps a single error voice", () => {
    expect(ERROR.title).toBe("Something went wrong");
    expect(ERROR.description).toBe("Give it another try.");
    expect(ERROR.description).not.toMatch(/on our end/i);
    expect(CTA.tryAgain).toBe("Try again");
  });

  it("uses calm titles without trailing periods", () => {
    const titles = [
      feed.latestEmpty.title,
      feed.followingThin.title,
      feed.followingQuiet.title,
      search.idle.title,
      search.noPeople.title,
      search.noMorePeople.title,
      search.noPosts.title,
      messages.inboxEmpty.title,
      messages.threadEmpty.title,
      profile.postsEmptyOwner.title,
      profile.noFollowers.title,
    ];
    for (const title of titles) {
      expect(title.endsWith(".")).toBe(false);
    }
  });

  it("points thin empties toward Latest or Find people", () => {
    expect(feed.followingThin.description).toMatch(/Latest/);
    expect(feed.followingQuiet.description).toMatch(/Latest/);
    expect(search.idle.description).toMatch(/Latest/);
    expect(search.noPeople.description("ada")).toMatch(/Latest/);
    expect(search.noPosts.description("ada")).toMatch(/Stuck/);
    expect(CTA.findPeople).toBe("Find people");
    expect(CTA.seeLatest).toBe("See Latest");
    expect(CTA.browseLatest).toBe("Browse Latest");
  });

  it("keeps DM and profile empties peer-to-peer", () => {
    expect(messages.inboxEmpty.description).toMatch(/profile|message/i);
    expect(messages.threadEmpty.description).toMatch(/Say hello/);
    expect(messages.inboxLoadFailed.description).toBe(ERROR.description);
    expect(profile.postsEmptyViewer.description("ada")).toBe("@ada hasn’t posted yet.");
    expect(profile.postsEmptyOwner.description).toMatch(/Stuck, Learning, or Building/);
  });
});
