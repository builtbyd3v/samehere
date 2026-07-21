export const YEAR_OPTIONS = [
  { value: "", label: "Select year" },
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "grad", label: "Grad student" },
] as const;

export const YEAR_VALUES = ["freshman", "sophomore", "junior", "senior", "grad"];

export const DEGREE_OPTIONS = [
  { value: "", label: "Select degree" },
  { value: "Associate", label: "Associate" },
  { value: "B.S.", label: "B.S." },
  { value: "B.A.", label: "B.A." },
  { value: "B.Eng.", label: "B.Eng." },
  { value: "M.S.", label: "M.S." },
  { value: "M.A.", label: "M.A." },
  { value: "MBA", label: "MBA" },
  { value: "Ph.D.", label: "Ph.D." },
  { value: "Certificate", label: "Certificate" },
  { value: "Other", label: "Other" },
] as const;

export const DEGREE_VALUES = DEGREE_OPTIONS.map((o) => o.value).filter(Boolean);

// Certificate/bootcamp programs (CodePath, Google certs) are normally held
// ALONGSIDE a degree, and they often start later, so "most recent current
// entry" picks the bootcamp over the university. People identify with the
// degree-granting school, so rank non-degree entries below it.
const NON_DEGREE = new Set<string>(["Certificate", "Other"]);

function isDegree(degree: string | null | undefined): boolean {
  return !!degree && !NON_DEGREE.has(degree);
}

// The single education entry that stands in for someone's school -- the
// profile tagline, match signals, and search context all need exactly one.
// Preference order:
//
//   1. a degree currently being studied
//   2. anything currently being studied (a bootcamp, once the degree is done)
//   3. any degree, for someone with nothing active
//   4. the first row
//
// Enrollment outranks a finished degree, so a graduate midway through a
// certificate reads as the certificate, not the alma mater. Ties fall back to
// the caller's ordering, so callers that care should sort by start_date
// descending first.
export function pickPrimaryEducation<T extends { degree?: string | null; is_current?: boolean | null }>(
  rows: readonly T[],
): T | undefined {
  return (
    rows.find((r) => r.is_current && isDegree(r.degree)) ??
    rows.find((r) => r.is_current) ??
    rows.find((r) => isDegree(r.degree)) ??
    rows[0]
  );
}
