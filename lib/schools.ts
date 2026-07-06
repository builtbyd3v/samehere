// US school list + matcher for the profile School autocomplete.
// The list (public/us_schools.json, ~2.3k US .edu schools) is fetched on demand
// by SchoolAutocomplete — it is NOT imported here, so it never enters the JS
// bundle. Each entry carries a precomputed acronym so "UF" resolves to
// "University of Florida" without a fuzzy-match dependency.

export type School = { name: string; domains: string[]; ac: string };

// Score a school against a query. Higher is better; 0 means no match.
// - exact acronym (UF, MIT)         → 100
// - acronym prefix (UC → UCLA…)     → 80
// - name starts with query          → 60
// - name contains query             → 40
// - every query word appears (any order, e.g. "univ mich") → 20
function score(school: School, upper: string, lower: string, words: string[]): number {
  if (school.ac === upper) return 100;
  if (school.ac.startsWith(upper)) return 80;
  const name = school.name.toLowerCase();
  if (name.startsWith(lower)) return 60;
  if (name.includes(lower)) return 40;
  if (words.length > 1 && words.every((w) => name.includes(w))) return 20;
  return 0;
}

export function searchSchools(query: string, list: School[], limit = 8): School[] {
  const q = query.trim();
  if (!q) return [];
  const upper = q.toUpperCase();
  const lower = q.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  return list
    .map((s) => ({ s, n: score(s, upper, lower, words) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.s.name.localeCompare(b.s.name))
    .slice(0, limit)
    .map((x) => x.s);
}

// ponytail: run `npx tsx lib/schools.ts` to sanity-check the matcher.
if (process.argv[1]?.endsWith("schools.ts")) {
  const sample: School[] = [
    { name: "University of Florida", domains: ["ufl.edu"], ac: "UF" },
    { name: "University of Findlay", domains: ["findlay.edu"], ac: "UF" },
    { name: "Massachusetts Institute of Technology", domains: ["mit.edu"], ac: "MIT" },
    { name: "University of California, Los Angeles", domains: ["ucla.edu"], ac: "UCLA" },
    { name: "University of Michigan", domains: ["umich.edu"], ac: "UM" },
  ];
  const top = (q: string) => searchSchools(q, sample).map((s) => s.name);
  console.assert(top("UF")[0].startsWith("University of F"), "UF should hit a U-of-F school first");
  console.assert(top("MIT")[0] === "Massachusetts Institute of Technology", "MIT exact");
  console.assert(top("UCLA")[0] === "University of California, Los Angeles", "UCLA exact");
  console.assert(top("univ mich")[0] === "University of Michigan", "multi-word AND match");
  console.assert(top("").length === 0, "empty query → no results");
  console.log("schools matcher self-check passed");
}
