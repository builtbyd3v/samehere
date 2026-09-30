import { describe, it, expect } from "vitest";
import { notificationHref, notificationLabel, type NotificationRow } from "./notifications";

const row: NotificationRow = {
  id: "n1",
  type: "stuck_help",
  post_id: "p1",
  repost_id: null,
  read: false,
  created_at: "2026-09-30T12:00:00Z",
  actor_id: "a1",
  actor_username: "ada",
  actor_display_name: "Ada",
  actor_avatar_url: null,
  actor_is_pro: false,
  reaction_type: null,
};

describe("stuck_help notifications", () => {
  it("links to the stuck post", () => {
    expect(notificationHref(row)).toBe("/post/p1");
  });

  it("names the actor and the stuck ask", () => {
    const label = notificationLabel("stuck_help", "Ada");
    expect(label).toContain("Ada");
    expect(label).toContain("stuck");
  });
});

describe("referral_reward notifications", () => {
  const reward: NotificationRow = { ...row, type: "referral_reward", post_id: null };

  it("links to the invite page", () => {
    expect(notificationHref(reward)).toBe("/referrals");
  });

  it("names the reward without an em dash", () => {
    const label = notificationLabel("referral_reward", "Ada");
    expect(label).toContain("month of Pro");
    expect(label).not.toContain("\u2014");
  });
});
