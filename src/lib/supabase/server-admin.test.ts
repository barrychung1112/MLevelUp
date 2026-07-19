import { describe, expect, test } from "vitest";

import { readServerSupabaseAdminConfig } from "./server-admin";

describe("readServerSupabaseAdminConfig", () => {
  test("requires a project URL and server-only service key", () => {
    expect(readServerSupabaseAdminConfig({})).toBeNull();
    expect(readServerSupabaseAdminConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    })).toBeNull();
  });

  test("returns trimmed server configuration without the browser key", () => {
    expect(readServerSupabaseAdminConfig({
      NEXT_PUBLIC_SUPABASE_URL: " https://project.supabase.co ",
      SUPABASE_SERVICE_ROLE_KEY: " server-only-key ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "must-not-be-used",
    })).toEqual({
      url: "https://project.supabase.co",
      serviceRoleKey: "server-only-key",
    });
  });
});
