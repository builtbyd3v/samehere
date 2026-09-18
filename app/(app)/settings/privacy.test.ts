import { describe, expect, it } from "vitest";
import { privacyUpdatesFromForm } from "@/lib/privacy-updates";

describe("privacy updates", () => {
  it("does not write leaderboard_opt_out", () => {
    const form = new FormData();
    form.set("is_private", "on");
    form.set("heatmap_visibility", "followers");
    form.set("show_on_leaderboard", "on");
    const updates = privacyUpdatesFromForm(form);
    expect(updates).not.toHaveProperty("leaderboard_opt_out");
    expect(updates.heatmap_visibility).toBe("followers");
  });
});
