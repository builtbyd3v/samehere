import { describe, it, expect } from "vitest";
import { pickPrimaryEducation } from "./education-options";

const codepath = { school: "Codepath", degree: "Certificate", is_current: true };
const uwm = { school: "University of Wisconsin - Milwaukee", degree: "B.S.", is_current: true };

describe("pickPrimaryEducation", () => {
  it("prefers the degree over a concurrent certificate", () => {
    // The bootcamp starts later, so a newest-first sort puts it first.
    expect(pickPrimaryEducation([codepath, uwm])?.school).toBe(uwm.school);
  });

  it("prefers a certificate in progress over a finished degree", () => {
    // Graduated, now doing a bootcamp: the bootcamp is what they are actually
    // doing, so it wins despite ranking lower as a credential.
    expect(pickPrimaryEducation([codepath, { ...uwm, is_current: false }])?.school).toBe(codepath.school);
  });

  it("falls back to a finished degree when nothing is active", () => {
    const done = [
      { ...codepath, is_current: false },
      { ...uwm, is_current: false },
    ];
    expect(pickPrimaryEducation(done)?.school).toBe(uwm.school);
  });

  it("falls back to the current entry when no degree exists", () => {
    const other = { school: "Some Bootcamp", degree: "Other", is_current: false };
    expect(pickPrimaryEducation([other, codepath])?.school).toBe(codepath.school);
  });

  it("falls back to the first row when nothing is current or a degree", () => {
    const a = { school: "A", degree: null, is_current: false };
    expect(pickPrimaryEducation([a, { school: "B", degree: "", is_current: false }])?.school).toBe("A");
  });

  it("keeps caller order among entries of the same rank", () => {
    const masters = { school: "Newer", degree: "M.S.", is_current: true };
    expect(pickPrimaryEducation([masters, uwm])?.school).toBe("Newer");
  });

  it("returns undefined for no rows", () => {
    expect(pickPrimaryEducation([])).toBeUndefined();
  });

  // The profile header feeds this current-only rows sorted newest-first. Real
  // rows from the two accounts that hit the bug: in both, a bootcamp started
  // after the degree and was winning the tagline.
  it("picks the degree out of a newest-first current list", () => {
    const dev = [
      { school: "CodePath", degree: "Certificate", is_current: true, start_date: "2026-06-01" },
      { school: "Western Governors University", degree: "B.S.", is_current: true, start_date: "2025-10-01" },
    ];
    const shumaila = [
      { school: "Codepath", degree: "Certificate", is_current: true, start_date: "2025-01-01" },
      { school: "University of Wisconsin - Milwaukee", degree: "B.S.", is_current: true, start_date: "2023-09-01" },
    ];
    expect(pickPrimaryEducation(dev)?.school).toBe("Western Governors University");
    expect(pickPrimaryEducation(shumaila)?.school).toBe("University of Wisconsin - Milwaukee");
  });
});
