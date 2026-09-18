import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// Plan W3 listed webpack First Load JS (110 / 100 / 160 / 120). Next 16
// Turbopack does not write that table; we measure gzip of shared + page +
// layout entry chunks from each route's client-reference manifest.
const ROOT = join(process.cwd(), ".next");
const ROUTES = {
  "/": { file: "server/app/page_client-reference-manifest.js", page: "[project]/app/page", gzip: 350 },
  "/login": { file: "server/app/(auth)/login/page_client-reference-manifest.js", page: "[project]/app/(auth)/login/page", gzip: 360 },
  "/signup": { file: "server/app/(auth)/signup/page_client-reference-manifest.js", page: "[project]/app/(auth)/signup/page", gzip: 360 },
  "/feed": { file: "server/app/(app)/feed/page_client-reference-manifest.js", page: "[project]/app/(app)/feed/page", gzip: 440 },
  "/profile/[username]": {
    file: "server/app/(app)/profile/[username]/page_client-reference-manifest.js",
    page: "[project]/app/(app)/profile/[username]/page",
    gzip: 440,
  },
};

const build = JSON.parse(readFileSync(join(ROOT, "build-manifest.json"), "utf8"));
const shared = [...(build.polyfillFiles ?? []), ...(build.rootMainFiles ?? [])];
const fail = [];

function entryFiles(src, pageKey) {
  const out = [];
  for (const m of src.matchAll(/"(\[project\]\/[^"]+)":\[((?:"static\/chunks\/[^"]+\.js",?)*)\]/g)) {
    if (m[1] === pageKey || m[1].endsWith("/app/layout") || m[1].endsWith("/(app)/layout") || m[1].endsWith("/(auth)/layout")) {
      out.push(...(m[2].match(/static\/chunks\/[^"]+\.js/g) ?? []));
    }
  }
  return out;
}

for (const [route, spec] of Object.entries(ROUTES)) {
  const path = join(ROOT, spec.file);
  if (!existsSync(path)) {
    fail.push(`missing ${spec.file}`);
    continue;
  }
  const src = readFileSync(path, "utf8");
  const files = [...new Set([...shared, ...entryFiles(src, spec.page)])];
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const buf = readFileSync(join(ROOT, file));
    raw += buf.length;
    gzip += gzipSync(buf).length;
  }
  console.log(`${route} first-load ${(raw / 1024).toFixed(1)} kB raw / ${(gzip / 1024).toFixed(1)} kB gzip (cap ${spec.gzip})`);
  if (gzip / 1024 > spec.gzip) fail.push(`${route} gzip ${(gzip / 1024).toFixed(1)}>${spec.gzip}`);
  if (route !== "/" && /node_modules\/(?:three|@react-three)/.test(src)) fail.push(`${route} pulled Three.js into the client graph`);
  if (/node_modules\/(?:openai|stripe|sharp|posthog-node)\//.test(src)) fail.push(`${route} server SDK in client graph`);
}

if (fail.length) {
  console.error("Route budget exceeded: " + fail.join("; "));
  process.exit(1);
}
