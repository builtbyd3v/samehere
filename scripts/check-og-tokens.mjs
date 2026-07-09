// Fails the build when lib/og-tokens.ts drifts from the `.dark` block in
// app/globals.css.
//
// The OG cards render through Satori, which has no CSS variables, so the dark
// palette has to exist twice: once as custom properties the app reads, once as
// TypeScript strings the cards read. Nothing links the two — restyle the app and
// the cards keep the old colours, silently, until someone shares a link. This is
// the link.
//
// ponytail: string compare, not a CSS parser. Values are hand-written literals in
// both files; if either ever holds a computed value, reach for a real parser.

import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const ts = await readFile(new URL("../lib/og-tokens.ts", import.meta.url), "utf8");

const open = css.indexOf(".dark {");
if (open === -1) throw new Error("check-og-tokens: no `.dark {` block in app/globals.css");
const dark = css.slice(open, css.indexOf("}", open));

const cssVars = new Map();
for (const [, name, value] of dark.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  cssVars.set(name, value);
}

const tsBody = ts.slice(ts.indexOf("export const DARK"), ts.indexOf("} as const;"));
const tsVars = [...tsBody.matchAll(/"(--[a-z0-9-]+)":\s*"([^"]+)"/g)];
if (tsVars.length === 0) throw new Error("check-og-tokens: no tokens found in lib/og-tokens.ts");

const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, "");

const drift = [];
for (const [, name, mirrored] of tsVars) {
  const source = cssVars.get(name);
  if (source === undefined) drift.push(`${name}: not defined in globals.css .dark`);
  else if (norm(source) !== norm(mirrored)) drift.push(`${name}: globals.css has ${source.trim()}, og-tokens.ts has ${mirrored}`);
}

if (drift.length > 0) {
  console.error("\nlib/og-tokens.ts is out of sync with the .dark block in app/globals.css:\n");
  for (const d of drift) console.error(`  ${d}`);
  console.error("\nThe OG cards would render the old palette. Update lib/og-tokens.ts.\n");
  process.exit(1);
}

console.log(`check-og-tokens: ${tsVars.length} tokens match app/globals.css`);
