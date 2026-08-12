import { describe, expect, it } from "vitest";
import {
  companiesFromListings,
  companiesFromTargetNames,
  resolveHelperCompanies,
  sanitizeOrgFilter,
  targetCompaniesFromAnswersJson,
} from "./home-helpers";

describe("sanitizeOrgFilter", () => {
  it("strips PostgREST filter metacharacters", () => {
    expect(sanitizeOrgFilter("Acme, Inc (HQ)*")).toBe("Acme Inc HQ");
  });
});

describe("resolveHelperCompanies", () => {
  it("prefers intake targets over listings", () => {
    expect(
      resolveHelperCompanies({
        targetCompanies: ["Stripe", "Adobe"],
        listings: [{ org: "Google", company_slug: "Google" }],
      }),
    ).toEqual([
      { org: "Stripe", company_slug: null },
      { org: "Adobe", company_slug: null },
    ]);
  });

  it("falls back to opportunity listings when intake is empty", () => {
    expect(
      resolveHelperCompanies({
        targetCompanies: [],
        listings: [
          { org: "Google", company_slug: "Google" },
          { org: "Google", company_slug: "Google" },
          { org: "Meta", company_slug: null },
        ],
      }),
    ).toEqual([
      { org: "Google", company_slug: "Google" },
      { org: "Meta", company_slug: null },
    ]);
  });
});

describe("companiesFromTargetNames / listings", () => {
  it("dedupes case-insensitively", () => {
    expect(companiesFromTargetNames(["Stripe", "stripe", "  "])).toEqual([
      { org: "Stripe", company_slug: null },
    ]);
    expect(
      companiesFromListings([
        { org: "A", company_slug: "a" },
        { org: "B", company_slug: "a" },
      ]),
    ).toEqual([{ org: "A", company_slug: "a" }]);
  });
});

describe("targetCompaniesFromAnswersJson", () => {
  it("reads target_companies without requiring full intake shape", () => {
    expect(
      targetCompaniesFromAnswersJson({
        target_companies: ["Stripe", "", 3, "Adobe"],
      }),
    ).toEqual(["Stripe", "Adobe"]);
    expect(targetCompaniesFromAnswersJson(null)).toEqual([]);
  });
});
