import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeUnsubToken, verifyUnsubToken } from "./email-unsub";

beforeEach(() => {
  vi.stubEnv("EMAIL_UNSUB_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("makeUnsubToken / verifyUnsubToken", () => {
  it("round-trips a valid token back to the same userId", () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const token = makeUnsubToken(userId);
    expect(verifyUnsubToken(token)).toBe(userId);
  });

  it("produces different tokens for different secrets", () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const token = makeUnsubToken(userId);
    vi.stubEnv("EMAIL_UNSUB_SECRET", "a-different-secret");
    expect(verifyUnsubToken(token)).toBeNull();
  });

  it("rejects a tampered HMAC", () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const token = makeUnsubToken(userId);
    const [id, hmac] = token.split(".");
    const tampered = `${id}.${hmac.slice(0, -1)}${hmac.at(-1) === "0" ? "1" : "0"}`;
    expect(verifyUnsubToken(tampered)).toBeNull();
  });

  it("rejects a tampered userId (HMAC no longer matches)", () => {
    const token = makeUnsubToken("11111111-1111-1111-1111-111111111111");
    const [, hmac] = token.split(".");
    const tampered = `22222222-2222-2222-2222-222222222222.${hmac}`;
    expect(verifyUnsubToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubToken("")).toBeNull();
    expect(verifyUnsubToken("no-dot-here")).toBeNull();
    expect(verifyUnsubToken(".onlyhmac")).toBeNull();
    expect(verifyUnsubToken("onlyid.")).toBeNull();
  });
});
