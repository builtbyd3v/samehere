import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "./feed-cursor";

describe("encodeCursor / decodeCursor", () => {
  it("round-trips a valid cursor", () => {
    const c = encodeCursor("2026-07-11T10:00:00.123456+00:00", "550e8400-e29b-41d4-a716-446655440000");
    expect(decodeCursor(c)).toEqual({
      created_at: "2026-07-11T10:00:00.123456+00:00",
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("round-trips a Z-suffixed timestamp", () => {
    const c = encodeCursor("2026-07-11T10:00:00Z", "550e8400-e29b-41d4-a716-446655440000");
    expect(decodeCursor(c)).not.toBeNull();
  });

  it("rejects a malformed timestamp", () => {
    expect(decodeCursor("not-a-date|550e8400-e29b-41d4-a716-446655440000")).toBeNull();
  });

  it("rejects a malformed id", () => {
    expect(decodeCursor("2026-07-11T10:00:00Z|not-a-uuid")).toBeNull();
  });

  it("rejects an attempted filter-injection payload", () => {
    // A crafted "id" trying to break out of the `.or()` filter string built
    // in loadMorePosts -- must be rejected by the UUID check, not passed through.
    expect(decodeCursor("2026-07-11T10:00:00Z|1),or(1.eq.1")).toBeNull();
  });

  it("rejects a string with no delimiter", () => {
    expect(decodeCursor("justastring")).toBeNull();
  });
});
