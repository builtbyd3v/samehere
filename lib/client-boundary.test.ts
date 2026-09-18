import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Plan PR-3a starting list: no hooks/handlers. Keep these as RSC so the
// directive lives on the leaf that owns state (ProfileHoverTarget, AppBrand, etc).
const SERVER_LEAVES = [
  "components/ui/LocalTime.tsx",
  "components/ui/MentionText.tsx",
  "components/auth/AuthShell.tsx",
  "components/profile/ProfileHoverLink.tsx",
  "components/feed/QuotedRepostCard.tsx",
  "components/landing/LoadingState.tsx",
  "components/messages/MessageTime.tsx",
  "components/portfolio/analysis/AnalysisStages.tsx",
  "app/(auth)/forgot-password/page.tsx",
  "app/(auth)/update-password/page.tsx",
];

const IMG_JUSTIFIED = [
  "components/feed/PostMediaGrid.tsx",
  "components/feed/PostComposer.tsx",
  "components/ui/CompanyLogo.tsx",
  "components/portfolio/PortfolioBanner.tsx",
  "components/profile/EditProfileForm.tsx",
];

describe("client boundary audit", () => {
  it("keeps the no-hook starting list free of use client", () => {
    for (const file of SERVER_LEAVES) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/^["']use client["']/m);
    }
  });

  it("justifies remaining raw img tags", () => {
    for (const file of IMG_JUSTIFIED) {
      const src = readFileSync(file, "utf8");
      expect(src, file).toMatch(/eslint-disable-next-line @next\/next\/no-img-element/);
    }
  });
});
