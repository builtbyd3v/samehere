import { afterEach, describe, expect, it } from "vitest";
import { isSupabaseStorageUrl } from "./storage-image";

const KEY = "NEXT_PUBLIC_SUPABASE_URL";
const prev = process.env[KEY];

afterEach(() => {
  if (prev === undefined) delete process.env[KEY];
  else process.env[KEY] = prev;
});

describe("isSupabaseStorageUrl", () => {
  it("accepts this project's storage object URLs", () => {
    process.env[KEY] = "https://abc.supabase.co";
    expect(isSupabaseStorageUrl("https://abc.supabase.co/storage/v1/object/public/avatars/u/banner?v=1")).toBe(true);
  });

  it("rejects other hosts and non-storage paths", () => {
    process.env[KEY] = "https://abc.supabase.co";
    expect(isSupabaseStorageUrl("https://img.logo.dev/foo.png")).toBe(false);
    expect(isSupabaseStorageUrl("https://abc.supabase.co/auth/v1/user")).toBe(false);
    expect(isSupabaseStorageUrl("/local.png")).toBe(false);
  });

  it("is false when the env host is missing", () => {
    delete process.env[KEY];
    expect(isSupabaseStorageUrl("https://abc.supabase.co/storage/v1/object/public/avatars/u/banner")).toBe(false);
  });
});
