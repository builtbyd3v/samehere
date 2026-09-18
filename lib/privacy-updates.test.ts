import { describe, expect, it } from "vitest";
import { privacyUpdatesFromForm } from "./privacy-updates";

describe("privacyUpdatesFromForm", () => {
  it("does not write leaderboard_opt_out", () => {
    const form = new FormData();
    form.set("is_private", "on");
    form.set("heatmap_visibility", "followers");
    form.set("show_on_leaderboard", "on");
    const updates = privacyUpdatesFromForm(form);
    expect(updates).toEqual({
      is_private: true,
      hide_school: false,
      heatmap_visibility: "followers",
      email_digest_opt_out: true,
    });
    expect(updates).not.toHaveProperty("leaderboard_opt_out");
  });
});
