import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), ".next");
const BUDGETS = {
  "/page": 110,
  "/login/page": 100,
  "/signup/page": 100,
  "/feed/page": 160,
  "/profile/[username]/page": 120,
};
const app = JSON.parse(readFileSync(join(ROOT, "app-build-manifest.json"), "utf8"));
const build = JSON.parse(readFileSync(join(ROOT, "build-manifest.json"), "utf8"));
const shared = [...(build.polyfillFiles ?? []), ...(build.rootMainFiles ?? [])];
const fail = [];
for (const [route, cap] of Object.entries(BUDGETS)) {
  const files = [...new Set([...shared, ...(app.pages[route] ?? [])].filter((f) => f.endsWith(".js")))];
  const kb = files.reduce((n, f) => n + (statSync(join(ROOT, f), { throwIfNoEntry: false })?.size ?? 0), 0) / 1024;
  console.log(`${route} first-load JS ${kb.toFixed(1)} kB (budget ${cap})`);
  if (kb > cap) fail.push(`${route} ${kb.toFixed(1)}>${cap}`);
}
if (fail.length) {
  console.error("Route budget exceeded: " + fail.join("; "));
  process.exit(1);
}
