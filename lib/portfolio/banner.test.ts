import { describe, expect, it } from "vitest";
import { portfolioBannerOg, portfolioBannerStops } from "./banner";

describe("portfolioBannerStops", () => {
  it("stays in cyan–blue and never purple", () => {
    for (const name of ["maya", "jordan", "priya", "zzz", "alex", "dev"]) {
      const stops = portfolioBannerStops(name);
      expect(stops.hueA).toBeGreaterThanOrEqual(190);
      expect(stops.hueA).toBeLessThanOrEqual(230);
      expect(stops.hueB).toBeGreaterThanOrEqual(190);
      expect(stops.hueB).toBeLessThanOrEqual(230);
      expect(stops.strengthA).toBeGreaterThanOrEqual(14);
      expect(stops.strengthA).toBeLessThanOrEqual(22);
    }
  });

  it("is deterministic", () => {
    expect(portfolioBannerStops("maya")).toEqual(portfolioBannerStops("Maya"));
    expect(portfolioBannerOg("jordan").from).toMatch(/^hsla\(2\d\d,/);
  });
});
