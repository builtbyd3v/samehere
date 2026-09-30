import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOwnAvatarUrl } from "./avatar";

const KEY = "NEXT_PUBLIC_SUPABASE_URL";
const prev = process.env[KEY];

beforeEach(() => {
  process.env[KEY] = "https://abc.supabase.co";
});

afterEach(() => {
  if (prev === undefined) delete process.env[KEY];
  else process.env[KEY] = prev;
});

describe("isOwnAvatarUrl", () => {
  it("accepts this project's public avatars bucket", () => {
    expect(isOwnAvatarUrl("https://abc.supabase.co/storage/v1/object/public/avatars/u1/avatar?v=1")).toBe(true);
  });

  it("rejects other hosts, schemes, and buckets", () => {
    expect(isOwnAvatarUrl("https://evil.test/storage/v1/object/public/avatars/u1/avatar")).toBe(false);
    expect(isOwnAvatarUrl("http://abc.supabase.co/storage/v1/object/public/avatars/u1/avatar")).toBe(false);
    expect(isOwnAvatarUrl("https://abc.supabase.co/storage/v1/object/public/post-media/x")).toBe(false);
    expect(isOwnAvatarUrl("https://abc.supabase.co.evil.test/storage/v1/object/public/avatars/x")).toBe(false);
    expect(isOwnAvatarUrl("not a url")).toBe(false);
  });

  it("is false when the env host is missing", () => {
    delete process.env[KEY];
    expect(isOwnAvatarUrl("https://abc.supabase.co/storage/v1/object/public/avatars/u1/avatar")).toBe(false);
  });
});
