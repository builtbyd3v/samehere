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
