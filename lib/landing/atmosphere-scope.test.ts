import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (/\.(tsx?|jsx?)$/.test(name)) acc.push(path);
  }
  return acc;
}

describe("landing atmosphere scope", () => {
  it("does not import three or r3f outside landing atmosphere files", () => {
    const files = ["app", "components", "lib"].flatMap((dir) => walk(dir));
    const offenders = files.filter((file) => {
      if (file.includes("LandingAtmosphere")) return false;
      if (file.includes("atmosphere-scope.test")) return false;
      const src = readFileSync(file, "utf8");
      return /from ["']three["']|from ["']@react-three/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
