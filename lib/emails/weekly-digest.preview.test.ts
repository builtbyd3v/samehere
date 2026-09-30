import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { weeklyDigestEmail } from "./weekly-digest";

const out = process.env.DIGEST_PREVIEW_OUT;

// Renders a fixture digest to a file for human review. Never sent. Generic sample names only.
it.skipIf(!out)("writes the weekly digest HTML to DIGEST_PREVIEW_OUT", () => {
  const email = weeklyDigestEmail(
    {
      people: [
        { username: "sample_one", displayName: "Sample Person One", stage: "job_search" },
        { username: "sample_two", displayName: null, stage: "job_search" },
      ],
      questions: [{ id: "00000000-0000-4000-8000-000000000001", excerpt: "How do I stop my React app from refetching on every render?", username: "sample_three", displayName: "Sample Person Three" }],
      views: 12,
    },
    "https://www.samehere.dev/api/email/unsubscribe?u=preview"
  );
  expect(email).not.toBeNull();
  if (email && out) writeFileSync(out, `<!-- ${email.subject} -->\n${email.html}`);
});
