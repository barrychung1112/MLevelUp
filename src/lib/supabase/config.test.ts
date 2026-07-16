import { describe, expect, test } from "vitest";

import { readSupabaseConfig } from "./config";

describe("readSupabaseConfig", () => {
  test("returns unavailable when either public setting is absent", () => {
    expect(readSupabaseConfig({})).toEqual({ available: false });
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" })).toEqual({ available: false });
  });

  test("returns trimmed public configuration", () => {
    expect(readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: " https://project.supabase.co ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " public-anon-key ",
    })).toEqual({
      available: true,
      url: "https://project.supabase.co",
      anonKey: "public-anon-key",
    });
  });
});
